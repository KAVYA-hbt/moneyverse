"""Live sync from the game's own Postgres DB into this app's DB.

Queries GAME_DATABASE_URL directly on a timer (see app/main.py's lifespan) -- via
app/game_db/, a read-only mirror of the game's own player/quiz/advisory tables plus an async
port of its profile-scoring logic -- and upserts into Player / FinancialProfile /
PsychometricProfile / QuestHistory. Same target shape and player-matching key
(external_game_id = "REAL-<game player_id>") as the one-off app/import_profiles.py script, but
re-runs forever and updates existing players in place instead of skipping them, so Player
Profiles reflects live gameplay instead of a stale one-time import.

Deliberately tolerant of the game's DB being unreachable (not yet started, wrong port, etc.) --
logs a warning and retries next interval rather than crashing the admin backend's startup.
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.game_db import profile_builder as game_profile_builder
from app.game_db.database import GameSessionLocal
from app.game_db.models import GamePlayer, GamePlayerStats
from app.models.models import FinancialProfile, Player, PsychometricProfile, QuestHistory

logger = logging.getLogger("finguru_admin.game_sync")

EXTERNAL_ID_PREFIX = "REAL-"


def _last_active(stats: GamePlayerStats | None) -> datetime:
    if stats and stats.last_played:
        return datetime.combine(stats.last_played, datetime.min.time(), tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


async def _upsert_player(session: AsyncSession, game_player: GamePlayer, financial_json: dict,
                          psych_json: dict, quest_history: list[dict], last_active: datetime) -> bool:
    """Returns True if a new admin-side Player row was created, False if an existing one was updated."""
    external_game_id = f"{EXTERNAL_ID_PREFIX}{game_player.id}"

    result = await session.execute(select(Player).where(Player.external_game_id == external_game_id))
    player = result.scalar_one_or_none()
    created = player is None

    if created:
        player = Player(
            external_game_id=external_game_id,
            name=game_player.name,
            phone_or_email=game_player.email,
            signup_date=last_active,
            last_active_at=last_active,
            # The game backend has no persisted "level" concept to read -- documented
            # placeholder, matching app/import_profiles.py's identical note.
            current_game_level=1,
            minor_flag=False,
            consent_status={},
        )
        session.add(player)
        await session.flush()  # assigns player.id for the rows below
        session.add(FinancialProfile(player_id=player.id, profile_json=financial_json, updated_at=last_active))
        session.add(PsychometricProfile(player_id=player.id, profile_json=psych_json, updated_at=last_active))
    else:
        player.last_active_at = last_active
        player.name = game_player.name

        fin_profile = await session.get(FinancialProfile, player.id)
        if fin_profile is None:
            session.add(FinancialProfile(player_id=player.id, profile_json=financial_json, updated_at=last_active))
        else:
            fin_profile.profile_json = financial_json
            fin_profile.updated_at = last_active

        psych_profile = await session.get(PsychometricProfile, player.id)
        if psych_profile is None:
            session.add(PsychometricProfile(player_id=player.id, profile_json=psych_json, updated_at=last_active))
        else:
            psych_profile.profile_json = psych_json
            psych_profile.updated_at = last_active

    existing_quest_ids = {
        row[0]
        for row in (
            await session.execute(select(QuestHistory.quest_id).where(QuestHistory.player_id == player.id))
        ).all()
    }
    for q in quest_history:
        if q["quest_id"] in existing_quest_ids:
            continue
        completed_at = (
            datetime.fromisoformat(q["completed_at"]) if q.get("completed_at") else last_active
        )
        if completed_at.tzinfo is None:
            completed_at = completed_at.replace(tzinfo=timezone.utc)
        session.add(
            QuestHistory(
                player_id=player.id,
                quest_id=q["quest_id"],
                quest_type=q.get("quest_type"),
                completed_at=completed_at,
                outcome_score=q.get("outcome_score"),
                decisions_log=q.get("decisions_log") or [],
            )
        )

    return created


async def sync_once() -> dict:
    created = updated = 0

    async with GameSessionLocal() as game_session, AsyncSessionLocal() as admin_session:
        game_players = (await game_session.execute(select(GamePlayer))).scalars().all()
        stats_by_player = {
            s.player_id: s
            for s in (await game_session.execute(select(GamePlayerStats))).scalars().all()
        }

        for game_player in game_players:
            quiz_attempts, advisory, completions = await game_profile_builder.fetch_player_data(
                game_session, game_player
            )
            financial = game_profile_builder.build_financial_profile(
                game_player, quiz_attempts, advisory, completions
            )
            psychometric = game_profile_builder.build_behavioral_profile(
                game_player, quiz_attempts, advisory
            )

            last_active = _last_active(stats_by_player.get(game_player.id))
            quest_history = financial.pop("quest_history")
            financial["last_updated"] = last_active.isoformat()
            psychometric["last_updated"] = last_active.isoformat()

            was_created = await _upsert_player(
                admin_session, game_player, financial, psychometric, quest_history, last_active
            )
            if was_created:
                created += 1
            else:
                updated += 1

        await admin_session.commit()

    logger.info("game_sync: %d created, %d updated (of %d players)", created, updated, len(game_players))
    return {"created": created, "updated": updated, "total": len(game_players)}


async def sync_loop() -> None:
    interval = max(5, settings.profile_sync_interval_seconds)
    while True:
        try:
            await sync_once()
        except (SQLAlchemyError, OSError) as exc:
            logger.warning(
                "game_sync: could not reach the game's DB at %s (%s); will retry in %ds",
                settings.game_database_url, exc, interval,
            )
        except Exception:
            logger.exception("game_sync: unexpected error during sync")
        await asyncio.sleep(interval)
