"""Seed script for local dev / demo data.

Run with:  python -m app.seed
Wipes and repopulates all tables. NOT for production use.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete

from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models.models import (
    AdminUser,
    AuditLog,
    FinancialProfile,
    FinguruInteraction,
    HandoffCase,
    HandoffResolution,
    HandoffTranscript,
    Player,
    ProfileMismatch,
    PsychometricProfile,
    QuestHistory,
)

DEV_PASSWORD = "devpass123"

random.seed(42)

INDIAN_FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
    "Priya", "Ananya", "Diya", "Saanvi", "Ishita", "Kavya", "Meera", "Riya",
    "Rohan", "Karthik", "Neha", "Pooja",
]
INDIAN_LAST_NAMES = [
    "Sharma", "Verma", "Iyer", "Nair", "Reddy", "Gupta", "Patel", "Menon",
    "Rao", "Singh", "Krishnan", "Kulkarni", "Chatterjee", "Bose", "Pillai", "Joshi",
]

SEGMENTS = ["cautious_saver", "aggressive_investor", "gig_earner", "first_jobber", "debt_stressed", "goal_planner"]
PRODUCTS = ["SIP-Mutual-Fund", "Fixed-Deposit", "Crypto-Watchlist", "Term-Insurance", "Recurring-Deposit", "Gold-Bond", "Credit-Card", "Personal-Loan"]

TIER1_REASONS = {"bot_confusion", "explicit_human_request"}
TIER2_REASONS = {"distress_language", "dpdp_request", "high_value_decision"}


def now() -> datetime:
    return datetime.now(timezone.utc)


def days_ago(n: int) -> datetime:
    return now() - timedelta(days=n)


def rand_name() -> str:
    return f"{random.choice(INDIAN_FIRST_NAMES)} {random.choice(INDIAN_LAST_NAMES)}"


async def wipe_all(session) -> None:
    for model in [
        AuditLog,
        HandoffResolution,
        HandoffTranscript,
        HandoffCase,
        ProfileMismatch,
        FinguruInteraction,
        QuestHistory,
        PsychometricProfile,
        FinancialProfile,
        Player,
        AdminUser,
    ]:
        await session.execute(delete(model))
    await session.commit()


def make_financial_profile_json(segment_tags: list[str], risk_appetite: str) -> dict:
    return {
        "financial_literacy": {
            "score": round(random.uniform(0.3, 0.95), 2),
            "level": random.choice(["beginner", "intermediate", "advanced"]),
        },
        "money_management_style": {
            "budgeting_frequency": random.choice(["weekly", "monthly", "irregular"]),
            "primary_style": random.choice(["planner", "spontaneous", "avoider"]),
        },
        "savings_behavior": {
            "avg_monthly_savings_rate_pct": round(random.uniform(2, 40), 1),
            "consistency": random.choice(["consistent", "sporadic", "declining"]),
        },
        "risk_and_investment": {
            "risk_appetite": risk_appetite,
            "preferred_instruments": random.sample(PRODUCTS, k=2),
        },
        "debt_and_credit": {
            "has_active_loan": random.choice([True, False]),
            "credit_score_band": random.choice(["poor", "fair", "good", "excellent"]),
        },
        "product_affinity": {
            "top_products": random.sample(PRODUCTS, k=3),
        },
        "segment_tags": segment_tags,
    }


def make_psychometric_profile_json(sample_size: int) -> dict:
    traits = ["cautious", "impulsive", "analytical", "social_influenced", "goal_oriented", "avoidant"]
    return {
        "decision_style": random.choice(["analytical", "intuitive", "consultative"]),
        "risk_psychology": random.choice(["loss_averse", "thrill_seeking", "balanced"]),
        "time_preference": random.choice(["present_biased", "future_focused", "balanced"]),
        "cognitive_biases_detected": random.sample(
            ["anchoring", "herd_mentality", "overconfidence", "loss_aversion", "recency_bias"], k=2
        ),
        "personality_traits_lite": {"openness": round(random.uniform(0, 1), 2), "conscientiousness": round(random.uniform(0, 1), 2)},
        "social_and_influence": {"peer_influence_score": round(random.uniform(0, 1), 2)},
        "stress_response": random.choice(["freeze", "avoid", "seek_help", "impulsive_action"]),
        "trait_summary_tags": random.sample(traits, k=2),
        "sample_size": sample_size,
    }


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        await wipe_all(session)

        # --- Admin users ---
        admins = [
            AdminUser(
                id=uuid.uuid4(), name="Rakesh Menon", email="rakesh.tier1@finguru.dev",
                role="tier1_admin", password_hash=hash_password(DEV_PASSWORD), created_at=days_ago(200),
            ),
            AdminUser(
                id=uuid.uuid4(), name="Sunita Rao", email="sunita.tier1@finguru.dev",
                role="tier1_admin", password_hash=hash_password(DEV_PASSWORD), created_at=days_ago(190),
            ),
            AdminUser(
                id=uuid.uuid4(), name="Arvind Krishnan", email="arvind.tier2@finguru.dev",
                role="tier2_admin", password_hash=hash_password(DEV_PASSWORD), created_at=days_ago(180),
            ),
            AdminUser(
                id=uuid.uuid4(), name="Deepa Iyer", email="deepa.tier2@finguru.dev",
                role="tier2_admin", password_hash=hash_password(DEV_PASSWORD), created_at=days_ago(170),
            ),
            AdminUser(
                id=uuid.uuid4(), name="Farah Khan", email="farah.analyst@finguru.dev",
                role="product_analyst", password_hash=hash_password(DEV_PASSWORD), created_at=days_ago(160),
            ),
        ]
        session.add_all(admins)
        await session.flush()
        tier1_admins = [a for a in admins if a.role == "tier1_admin"]
        tier2_admins = [a for a in admins if a.role == "tier2_admin"]

        # --- Players ---
        players: list[Player] = []
        NUM_PLAYERS = 16
        for i in range(NUM_PLAYERS):
            p = Player(
                id=uuid.uuid4(),
                external_game_id=f"FG-GAME-{1000 + i}",
                name=rand_name(),
                phone_or_email=f"player{i}@example.in",
                signup_date=days_ago(random.randint(60, 400)),
                last_active_at=days_ago(random.randint(0, 20)),
                current_game_level=random.randint(1, 25),
                minor_flag=(i == NUM_PLAYERS - 1),  # one minor player for compliance flag coverage
                consent_status={"data_processing": True, "marketing": random.choice([True, False]), "dpdp_ack": True},
            )
            players.append(p)
        session.add_all(players)
        await session.flush()

        # designate the mismatch showcase player explicitly (declared risk_averse, revealed crypto-curious)
        mismatch_player = players[0]

        for idx, p in enumerate(players):
            quest_count = random.choice([0, 2, 4, 6, 9, 12, 15, 18, 22])
            segment_tags = random.sample(SEGMENTS, k=random.randint(1, 2))

            if p.id == mismatch_player.id:
                risk_appetite = "risk_averse"
                segment_tags = ["cautious_saver"]
                quest_count = 15  # ensure high confidence so the mismatch is visibly credible
            else:
                risk_appetite = random.choice(["risk_averse", "moderate", "risk_seeking"])

            fin_profile = FinancialProfile(
                player_id=p.id,
                profile_json=make_financial_profile_json(segment_tags, risk_appetite),
                updated_at=days_ago(random.randint(1, 30)),
            )
            session.add(fin_profile)

            psych_profile = PsychometricProfile(
                player_id=p.id,
                profile_json=make_psychometric_profile_json(sample_size=quest_count),
                updated_at=days_ago(random.randint(1, 30)),
            )
            session.add(psych_profile)

            for q in range(quest_count):
                session.add(
                    QuestHistory(
                        id=uuid.uuid4(),
                        player_id=p.id,
                        quest_id=f"Q-{idx}-{q}",
                        quest_type=random.choice(["budget_challenge", "savings_sprint", "risk_simulator", "credit_quiz"]),
                        completed_at=days_ago(random.randint(1, 90)),
                        outcome_score=round(random.uniform(0.2, 1.0), 2),
                        decisions_log=[
                            {"step": s, "choice": random.choice(["save", "spend", "invest", "skip"])}
                            for s in range(random.randint(2, 5))
                        ],
                    )
                )

            num_interactions = random.randint(1, 4)
            for _ in range(num_interactions):
                session.add(
                    FinguruInteraction(
                        id=uuid.uuid4(),
                        player_id=p.id,
                        interaction_type=random.choice(["recommendation", "chat", "advisory_session"]),
                        summary_text=random.choice([
                            "Discussed monthly SIP allocation and emergency fund targets.",
                            "Player asked about recurring deposit vs fixed deposit returns.",
                            "Bot recommended a term insurance top-up based on income change.",
                            "Player explored credit score improvement tips.",
                        ]),
                        product_discussed=random.choice(PRODUCTS),
                        occurred_at=days_ago(random.randint(1, 60)),
                        raw_transcript_ref=None,
                    )
                )

            # the showcase mismatch: declared risk_averse but 3 crypto-related interactions
            if p.id == mismatch_player.id:
                for _ in range(3):
                    session.add(
                        FinguruInteraction(
                            id=uuid.uuid4(),
                            player_id=p.id,
                            interaction_type=random.choice(["chat", "recommendation"]),
                            summary_text="Player asked FinGuru bot about crypto trading strategies and requested a Crypto-Watchlist recommendation despite declared low-risk profile.",
                            product_discussed="Crypto-Watchlist",
                            occurred_at=days_ago(random.randint(1, 15)),
                            raw_transcript_ref=None,
                        )
                    )
                session.add(
                    ProfileMismatch(
                        id=uuid.uuid4(),
                        player_id=p.id,
                        mismatch_type="declared_vs_revealed_risk",
                        description=(
                            "Financial profile declares risk_and_investment.risk_appetite = 'risk_averse', "
                            "but 3 recent finguru_interactions show active crypto product interest "
                            "(Crypto-Watchlist chats/recommendations) -- declared and revealed risk behaviour diverge."
                        ),
                        detected_at=days_ago(3),
                        resolved=False,
                    )
                )

            # a small handful of extra mismatches scattered on other players
            if idx in (3, 7, 11) and p.id != mismatch_player.id:
                session.add(
                    ProfileMismatch(
                        id=uuid.uuid4(),
                        player_id=p.id,
                        mismatch_type=random.choice(["declared_vs_revealed_savings", "declared_vs_revealed_debt"]),
                        description="Declared savings consistency does not match observed quest decision patterns over the last 30 days.",
                        detected_at=days_ago(random.randint(1, 10)),
                        resolved=random.choice([True, False]),
                    )
                )

        await session.flush()

        # --- Handoff cases: cover all trigger_reason values, tier 1/2, status open/claimed/resolved ---
        trigger_reasons = [
            "bot_confusion",
            "distress_language",
            "dpdp_request",
            "high_value_decision",
            "explicit_human_request",
        ]
        bot_reasoning_by_reason = {
            "bot_confusion": "Bot could not classify the player's intent after 3 clarification attempts.",
            "distress_language": "Player message contained language patterns flagged by the distress-detection model.",
            "dpdp_request": "Player invoked a data access/deletion request under DPDP Act, requires human handling.",
            "high_value_decision": "Player is considering a transaction above the auto-advisory threshold (>INR 5,00,000).",
            "explicit_human_request": "Player explicitly asked to speak with a human advisor.",
        }
        statuses = ["open", "claimed", "resolved"]

        case_specs = []
        for reason in trigger_reasons:
            for status_val in statuses:
                case_specs.append((reason, status_val))
        # a couple of extra open cases for volume
        case_specs.append(("bot_confusion", "open"))
        case_specs.append(("distress_language", "open"))

        for i, (reason, status_val) in enumerate(case_specs):
            player = players[i % len(players)]
            tier_required = 1 if reason in TIER1_REASONS else 2
            created_at = days_ago(random.randint(1, 20))

            case = HandoffCase(
                id=uuid.uuid4(),
                player_id=player.id,
                trigger_reason=reason,
                tier_required=tier_required,
                status=status_val,
                assigned_admin_id=None,
                created_at=created_at,
                claimed_at=None,
                resolved_at=None,
                bot_reasoning_text=bot_reasoning_by_reason[reason],
                escalation_source=None,
                escalated_by_admin_id=None,
                escalation_reason_text=None,
            )

            # sprinkle a couple of manually-escalated tier1->tier2 cases so a tier1_admin
            # still has visibility into something they escalated themselves
            if reason == "bot_confusion" and status_val == "resolved":
                escalator = tier1_admins[0]
                case.tier_required = 2
                case.escalation_source = "manual"
                case.escalated_by_admin_id = escalator.id
                case.escalation_reason_text = "Player's situation turned out to involve a high-value product decision; escalating to tier 2."

            session.add(case)
            await session.flush()

            # transcript
            messages = [
                ("player", "Hi, I need some help understanding my recommendation.", False),
                ("bot", "Sure, I can help with that. Could you tell me more?", False),
            ]
            if reason == "distress_language":
                messages.append(("player", "I'm really stressed, I don't know what to do with my loan payments.", True))
            elif reason == "dpdp_request":
                messages.append(("player", "I want you to delete all my personal data now.", True))
            elif reason == "high_value_decision":
                messages.append(("player", "I want to invest my full bonus of 8 lakhs into one stock.", True))
            elif reason == "explicit_human_request":
                messages.append(("player", "Please connect me to a real person.", True))
            else:
                messages.append(("player", "That doesn't answer my question at all, this is confusing.", True))
            messages.append(("bot", "I understand. Let me connect you with a member of our support team.", False))

            for sender, text, is_trigger in messages:
                session.add(
                    HandoffTranscript(
                        id=uuid.uuid4(),
                        handoff_case_id=case.id,
                        sender=sender,
                        message_text=text,
                        sent_at=created_at + timedelta(minutes=random.randint(0, 5)),
                        is_trigger_message=is_trigger,
                    )
                )

            if status_val in ("claimed", "resolved"):
                admin_pool = tier1_admins if case.tier_required == 1 else tier2_admins
                assignee = random.choice(admin_pool)
                case.assigned_admin_id = assignee.id
                case.claimed_at = created_at + timedelta(minutes=random.randint(5, 60))

            if status_val == "resolved":
                resolver_id = case.assigned_admin_id
                case.resolved_at = case.claimed_at + timedelta(minutes=random.randint(5, 120))
                session.add(
                    HandoffResolution(
                        handoff_case_id=case.id,
                        outcome=random.choice(["resolved_by_admin", "player_reassured", "escalated_to_compliance"]),
                        time_to_resolution_seconds=int((case.resolved_at - case.created_at).total_seconds()),
                        notes="Resolved after direct conversation with player; no further action needed.",
                        resolved_by_admin_id=resolver_id,
                    )
                )

        await session.commit()

        print(f"Seeded {len(admins)} admins, {len(players)} players, {len(case_specs)} handoff cases.")
        print(f"Dev login password for all seeded admins: {DEV_PASSWORD}")
        for a in admins:
            print(f"  {a.email}  ({a.role})")
        print(f"Mismatch showcase player_id: {mismatch_player.id}  ({mismatch_player.name})")


async def main() -> None:
    await seed()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
