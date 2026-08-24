"""In-memory mock "digital twin" data for previewing the Player Profiles UI without a seeded
database. Toggle via DATA_SOURCE=mock in .env / config.py (see app/core/config.py).

Generated once at import time with a fixed seed so player IDs, names, and profile content stay
stable across requests and server restarts -- important since the frontend caches by player_id
and the AI summary endpoint hashes profile content to decide whether to regenerate.

Mock mode covers /api/profiles only. Auth and /api/handoffs still read the real database, since
"digital twin" here refers specifically to the financial + psychometric profile data, not the
whole app -- previewing the profile screens shouldn't require a fully seeded DB.
"""

import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.services.ai_summary import compute_source_hash, generate_summary_text
from app.services.confidence import compute_confidence

_rng = random.Random(4242)

_FIRST_NAMES = ["Aarav", "Vivaan", "Ishita", "Kavya", "Rohan", "Neha", "Arjun", "Meera", "Sai", "Priya"]
_LAST_NAMES = ["Sharma", "Verma", "Iyer", "Nair", "Reddy", "Gupta", "Menon", "Rao"]
_SEGMENTS = ["cautious_saver", "aggressive_investor", "gig_earner", "first_jobber", "debt_stressed", "goal_planner"]
_PRODUCTS = [
    "SIP-Mutual-Fund", "Fixed-Deposit", "Crypto-Watchlist", "Term-Insurance",
    "Recurring-Deposit", "Gold-Bond", "Credit-Card", "Personal-Loan",
]
_TRAITS = ["cautious", "impulsive", "analytical", "social_influenced", "goal_oriented", "avoidant"]
_QUEST_TYPES = ["budgeting_sim", "risk_quiz", "savings_challenge", "credit_101", "investing_basics"]
_INTERACTION_TYPES = ["recommendation", "chat", "advisory_session"]

MOCK_PLAYER_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "finguru.dev/mock-players")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _mock_player_id(index: int) -> uuid.UUID:
    return uuid.uuid5(MOCK_PLAYER_NAMESPACE, f"player-{index}")


def _build_financial_profile(segment_tags: list[str], risk_appetite: str) -> dict[str, Any]:
    return {
        "financial_literacy": {
            "score": round(_rng.uniform(0.3, 0.95), 2),
            "level": _rng.choice(["beginner", "intermediate", "advanced"]),
        },
        "money_management_style": {
            "budgeting_frequency": _rng.choice(["weekly", "monthly", "irregular"]),
            "primary_style": _rng.choice(["planner", "spontaneous", "avoider"]),
        },
        "savings_behavior": {
            "avg_monthly_savings_rate_pct": round(_rng.uniform(2, 40), 1),
            "consistency": _rng.choice(["consistent", "sporadic", "declining"]),
        },
        "risk_and_investment": {
            "risk_appetite": risk_appetite,
            "preferred_instruments": _rng.sample(_PRODUCTS, k=2),
        },
        "debt_and_credit": {
            "has_active_loan": _rng.choice([True, False]),
            "credit_score_band": _rng.choice(["poor", "fair", "good", "excellent"]),
        },
        "product_affinity": {"top_products": _rng.sample(_PRODUCTS, k=3)},
        "segment_tags": segment_tags,
    }


def _build_psychometric_profile(sample_size: int) -> dict[str, Any]:
    return {
        "decision_style": _rng.choice(["analytical", "intuitive", "consultative"]),
        "risk_psychology": _rng.choice(["loss_averse", "thrill_seeking", "balanced"]),
        "time_preference": _rng.choice(["present_biased", "future_focused", "balanced"]),
        "cognitive_biases_detected": _rng.sample(
            ["anchoring", "herd_mentality", "overconfidence", "loss_aversion", "recency_bias"], k=2
        ),
        "personality_traits_lite": {
            "openness": round(_rng.uniform(0, 1), 2),
            "conscientiousness": round(_rng.uniform(0, 1), 2),
        },
        "social_and_influence": {"peer_influence_score": round(_rng.uniform(0, 1), 2)},
        "stress_response": _rng.choice(["freeze", "avoid", "seek_help", "impulsive_action"]),
        "trait_summary_tags": _rng.sample(_TRAITS, k=2),
        "sample_size": sample_size,
    }


def _build_player(index: int) -> dict[str, Any]:
    player_id = _mock_player_id(index)
    name = f"{_rng.choice(_FIRST_NAMES)} {_rng.choice(_LAST_NAMES)}"
    quest_count = _rng.randint(0, 20)
    segment_tags = _rng.sample(_SEGMENTS, k=_rng.randint(1, 2))

    # Player #0 is the fixed declared-vs-revealed mismatch showcase, matching the seed script's
    # Vihaan Sharma case, so mock mode always has something for the mismatch UI to render.
    is_mismatch_showcase = index == 0
    risk_appetite = "risk_averse" if is_mismatch_showcase else _rng.choice(
        ["risk_averse", "moderate", "risk_seeking"]
    )
    if is_mismatch_showcase:
        name = "Mock Vihaan (Mismatch Demo)"
        segment_tags = ["cautious_saver"]

    financial_profile = _build_financial_profile(segment_tags, risk_appetite)
    psychometric_profile = _build_psychometric_profile(sample_size=quest_count)

    signup_date = _now() - timedelta(days=_rng.randint(30, 400))
    last_active_at = _now() - timedelta(days=_rng.randint(0, 14))

    quests = [
        {
            "quest_id": f"mock-quest-{index}-{i}",
            "quest_type": _rng.choice(_QUEST_TYPES),
            "completed_at": _now() - timedelta(days=_rng.randint(0, 60)),
            "outcome_score": round(_rng.uniform(0.2, 1.0), 2),
        }
        for i in range(min(quest_count, 5))
    ]

    interactions = [
        {
            "interaction_type": _rng.choice(_INTERACTION_TYPES),
            "product_discussed": _rng.choice(_PRODUCTS),
            "occurred_at": _now() - timedelta(days=_rng.randint(0, 30)),
            "summary_text": "Mock interaction summary for preview purposes.",
        }
        for _ in range(3)
    ]
    mismatches: list[dict[str, Any]] = []
    if is_mismatch_showcase:
        interactions = [
            {
                "interaction_type": "chat",
                "product_discussed": "Crypto-Watchlist",
                "occurred_at": _now() - timedelta(days=d),
                "summary_text": "Player asked about crypto price swings and how to buy on FinGuru.",
            }
            for d in (2, 6, 11)
        ]
        mismatches = [
            {
                "id": uuid.uuid5(MOCK_PLAYER_NAMESPACE, f"mismatch-{index}"),
                "mismatch_type": "declared_vs_revealed_risk",
                "description": (
                    "Financial profile declares risk_and_investment.risk_appetite = 'risk_averse', "
                    "but 3 recent finguru_interactions show repeated crypto-related queries."
                ),
                "detected_at": _now() - timedelta(days=2),
                "resolved": False,
            }
        ]

    return {
        "id": player_id,
        "external_game_id": f"MOCK-{index:03d}",
        "name": name,
        "signup_date": signup_date,
        "last_active_at": last_active_at,
        "current_game_level": _rng.randint(1, 20),
        "minor_flag": False,
        "consent_status": {"data_processing": True, "marketing": _rng.choice([True, False])},
        "financial_profile": financial_profile,
        "psychometric_profile": psychometric_profile,
        "quest_count": quest_count,
        "quests": quests,
        "interactions": interactions,
        "mismatches": mismatches,
    }


_MOCK_PLAYERS: list[dict[str, Any]] = [_build_player(i) for i in range(12)]
_MOCK_PLAYERS_BY_ID: dict[uuid.UUID, dict[str, Any]] = {p["id"]: p for p in _MOCK_PLAYERS}


def list_mock_players() -> list[dict[str, Any]]:
    return _MOCK_PLAYERS


def get_mock_player(player_id: uuid.UUID) -> dict[str, Any] | None:
    return _MOCK_PLAYERS_BY_ID.get(player_id)


def mock_active_flags(player: dict[str, Any]) -> list[dict[str, Any]]:
    flags = [
        {"kind": "mismatch", "label": m["mismatch_type"], "detail": m["description"]}
        for m in player["mismatches"]
    ]
    return flags


def mock_ai_summary(player: dict[str, Any]) -> dict[str, Any]:
    mismatch_state = [{"mismatch_type": m["mismatch_type"]} for m in player["mismatches"]]
    summary_text, based_on = generate_summary_text(
        player["name"], player["financial_profile"], player["psychometric_profile"], mismatch_state
    )
    return {
        "summary_text": summary_text,
        "based_on": based_on,
        "generated_at": _now(),
        # Mock data never changes at runtime (aside from in-session overrides), so the cache
        # hash comparison would always be trivially true -- report is_cached=False since nothing
        # is actually persisted/cached in mock mode.
        "is_cached": False,
    }


def apply_mock_override(player_id: uuid.UUID, field_path: str, new_value: Any) -> bool:
    """Mutates the in-memory mock player for the lifetime of the process. Not persisted."""
    player = get_mock_player(player_id)
    if player is None:
        return False
    if field_path.startswith("financial_profile."):
        key = field_path.split(".", 1)[1]
        player["financial_profile"][key] = new_value
        return True
    if field_path.startswith("psychometric_profile."):
        key = field_path.split(".", 1)[1]
        player["psychometric_profile"][key] = new_value
        return True
    return False


__all__ = [
    "list_mock_players",
    "get_mock_player",
    "mock_active_flags",
    "mock_ai_summary",
    "apply_mock_override",
    "compute_confidence",
    "compute_source_hash",
]
