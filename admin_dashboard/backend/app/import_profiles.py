"""One-off importer for real "digital twin" export files (e.g. all_profiles.json), as opposed
to the synthetic app/seed.py data.

Run with:  python -m app.import_profiles path/to/all_profiles.json
Additive and idempotent: skips any player whose external_game_id already exists, so it's safe
to re-run. Does not touch admin_users or handoff_cases -- this only imports player + financial
+ psychometric + quest data.

Input shape (see all_profiles.json): { "count": N, "players": [ { "email", "financial_behavior",
"psychometric" }, ... ] }. Real telemetry from an early-stage game is mostly nulls -- every
field is imported verbatim, nulls included, so the API/UI can grey out what isn't measured yet
rather than fabricating values.
"""

import asyncio
import sys
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.models import FinancialProfile, Player, PsychometricProfile, QuestHistory

EXTERNAL_ID_PREFIX = "REAL-"


def _parse_dt(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    dt = datetime.fromisoformat(value)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _derive_name(email: str) -> str:
    local_part = email.split("@", 1)[0]
    cleaned = local_part.replace(".", " ").replace("_", " ").strip() or "Unknown Player"
    return cleaned[:1].upper() + cleaned[1:]


async def import_file(path: str) -> None:
    import json

    with open(path, encoding="utf-16") as f:
        data = json.load(f)

    players = data.get("players", [])
    print(f"Found {len(players)} players in {path}")

    async with AsyncSessionLocal() as session:
        imported = 0
        skipped = 0

        for entry in players:
            fb = entry["financial_behavior"]
            psy = entry["psychometric"]
            email = entry.get("email") or f"player-{fb['player_id']}@unknown"
            external_game_id = f"{EXTERNAL_ID_PREFIX}{fb['player_id']}"

            existing = await session.execute(
                select(Player).where(Player.external_game_id == external_game_id)
            )
            if existing.scalar_one_or_none() is not None:
                skipped += 1
                continue

            last_updated = _parse_dt(fb.get("last_updated"))

            player = Player(
                external_game_id=external_game_id,
                name=_derive_name(email),
                phone_or_email=email,
                signup_date=last_updated,
                last_active_at=last_updated,
                # current_game_level isn't present in this export shape -- 1 is a documented
                # placeholder, not a real signal (frontend doesn't grey this one out since a
                # missing level is indistinguishable from an actual level-1 player).
                current_game_level=1,
                minor_flag=False,
                consent_status={},
            )
            session.add(player)
            await session.flush()  # assigns player.id

            financial_json = {k: v for k, v in fb.items() if k != "quest_history"}
            session.add(
                FinancialProfile(
                    player_id=player.id,
                    profile_json=financial_json,
                    updated_at=last_updated,
                )
            )
            session.add(
                PsychometricProfile(
                    player_id=player.id,
                    profile_json=psy,
                    updated_at=last_updated,
                )
            )

            for q in fb.get("quest_history", []):
                session.add(
                    QuestHistory(
                        player_id=player.id,
                        quest_id=q["quest_id"],
                        quest_type=q.get("quest_type"),
                        completed_at=_parse_dt(q.get("completed_at")),
                        outcome_score=q.get("outcome_score"),
                        decisions_log=q.get("decisions_log") or [],
                    )
                )

            imported += 1

        await session.commit()

    print(f"Imported {imported} new players, skipped {skipped} already-imported players.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m app.import_profiles path/to/all_profiles.json")
        sys.exit(1)
    asyncio.run(import_file(sys.argv[1]))
