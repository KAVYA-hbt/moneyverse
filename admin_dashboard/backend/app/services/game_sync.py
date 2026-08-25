"""Sync from the game's own data into this app's DB, in one of two modes.

"db" (default): queries GAME_DATABASE_URL directly on a timer (see app/main.py's lifespan) --
via app/game_db/, a read-only mirror of the game's own player/quiz/advisory tables plus an
async port of its profile-scoring logic -- and upserts into Player / FinancialProfile /
PsychometricProfile / QuestHistory. Deliberately tolerant of the game's DB being unreachable
(not yet started, wrong port, etc.) -- logs a warning and retries next interval rather than
crashing the admin backend's startup.

"json_file": for when this backend can't open a direct DB connection to the game's database at
all (e.g. a locked-down sandbox network) but both backends' processes share a filesystem.
Polls a JSON file the game backend writes to disk after every profile-relevant change (see
backend/app/main.py's _write_profiles_export_to_disk) instead of querying Postgres.

Both modes converge on the same upsert logic (_upsert_player) and the same player-matching key
(external_game_id = "REAL-<game player_id>") as the one-off app/import_profiles.py script, but
re-run forever and update existing players in place instead of skipping them, so Player
Profiles reflects live gameplay instead of a stale one-time import.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.game_db import profile_builder as game_profile_builder
from app.game_db.database import GameSessionLocal
from app.game_db.models import GamePlayer, GamePlayerStats
from app.models.models import FinancialProfile, Player, PsychometricProfile, QuestHistory
from app.services.pubsub import publish_event

logger = logging.getLogger("finguru_admin.game_sync")

EXTERNAL_ID_PREFIX = "REAL-"


def _last_active(stats: GamePlayerStats | None) -> datetime:
    if stats and stats.last_played:
        return datetime.combine(stats.last_played, datetime.min.time(), tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def _parse_dt(value: str | None) -> datetime:
    """Same parsing as app/import_profiles.py -- the json_file path consumes the exact same
    export shape that script does."""
    if not value:
        return datetime.now(timezone.utc)
    dt = datetime.fromisoformat(value)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _derive_name(email: str) -> str:
    local_part = email.split("@", 1)[0]
    cleaned = local_part.replace(".", " ").replace("_", " ").strip() or "Unknown Player"
    return cleaned[:1].upper() + cleaned[1:]


def _resolve_json_path(path: str) -> Path:
    p = Path(path)
    if p.is_absolute():
        return p
    # This file lives at admin_dashboard/backend/app/services/game_sync.py -- parents[2] is
    # admin_dashboard/backend, which is what the .env default's "../../shared_data/..." is
    # written relative to.
    return (Path(__file__).resolve().parents[2] / p).resolve()


async def _upsert_player(session: AsyncSession, external_game_id: str, name: str, email: str,
                          financial_json: dict, psych_json: dict, quest_history: list[dict],
                          last_active: datetime) -> bool:
    """Returns True if a new admin-side Player row was created, False if an existing one was updated."""
    result = await session.execute(select(Player).where(Player.external_game_id == external_game_id))
    player = result.scalar_one_or_none()
    created = player is None

    if created:
        player = Player(
            external_game_id=external_game_id,
            name=name,
            phone_or_email=email,
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
        player.name = name

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
                admin_session,
                f"{EXTERNAL_ID_PREFIX}{game_player.id}",
                game_player.name,
                game_player.email,
                financial, psychometric, quest_history, last_active,
            )
            if was_created:
                created += 1
            else:
                updated += 1

        await admin_session.commit()

    logger.info("game_sync: %d created, %d updated (of %d players)", created, updated, len(game_players))
    return {"created": created, "updated": updated, "total": len(game_players)}


async def sync_once_from_json(path: str) -> dict:
    """json_file mode: same target shape/upsert logic as sync_once(), sourced from a file the
    game backend wrote instead of a live SQL connection. Input shape matches
    app/import_profiles.py's: {"count": N, "players": [{"email", "financial_behavior",
    "psychometric"}, ...]}."""
    file_path = _resolve_json_path(path)
    if not file_path.exists():
        raise FileNotFoundError(str(file_path))

    data = json.loads(file_path.read_text(encoding="utf-8"))
    entries = data.get("players", [])
    created = updated = 0

    async with AsyncSessionLocal() as admin_session:
        for entry in entries:
            fb = entry["financial_behavior"]
            psy = entry["psychometric"]
            email = entry.get("email") or f"player-{fb['player_id']}@unknown"
            external_game_id = f"{EXTERNAL_ID_PREFIX}{fb['player_id']}"
            last_active = _parse_dt(fb.get("last_updated"))
            quest_history = fb.get("quest_history") or []
            financial_json = {k: v for k, v in fb.items() if k != "quest_history"}

            was_created = await _upsert_player(
                admin_session, external_game_id, _derive_name(email), email,
                financial_json, psy, quest_history, last_active,
            )
            if was_created:
                created += 1
            else:
                updated += 1

        await admin_session.commit()

    logger.info("game_sync(json): %d created, %d updated (of %d players)", created, updated, len(entries))
    return {"created": created, "updated": updated, "total": len(entries)}


async def _publish_if_changed(result: dict) -> None:
    if result["created"] or result["updated"]:
        await publish_event({"type": "profiles_synced", **result})


async def sync_loop() -> None:
    if settings.use_json_game_sync:
        interval = max(1, settings.game_sync_json_poll_seconds)
        while True:
            try:
                await _publish_if_changed(await sync_once_from_json(settings.game_export_json_path))
            except FileNotFoundError as exc:
                logger.warning(
                    "game_sync(json): export file not found at %s yet; will retry in %ds",
                    exc, interval,
                )
            except Exception:
                logger.exception("game_sync(json): unexpected error during sync")
            await asyncio.sleep(interval)
        return

    interval = max(5, settings.profile_sync_interval_seconds)
    while True:
        try:
            await _publish_if_changed(await sync_once())
        except (SQLAlchemyError, OSError) as exc:
            logger.warning(
                "game_sync: could not reach the game's DB at %s (%s); will retry in %ds",
                settings.game_database_url, exc, interval,
            )
        except Exception:
            logger.exception("game_sync: unexpected error during sync")
        await asyncio.sleep(interval)
