"""
Generates fake-but-realistic-shaped profile JSONs for testing the admin
dashboard UI before enough real players exist to populate it.

IMPORTANT: every object returned here has "synthetic": true at the top
level. Never merge this into a real export, and the admin dashboard
should visibly flag any record carrying that field so nobody mistakes a
demo row for a real player.
"""

import random
import uuid
from datetime import datetime, timedelta

SEGMENT_TAGS_POOL = ["saver", "risk_averse", "impulsive_spender", "goal_oriented", "credit_naive"]
TRAIT_TAGS_POOL = ["cautious_planner", "thrill_seeker", "advice_dependent", "loss_averse", "present_biased"]


def _r(lo, hi):
    return round(random.uniform(lo, hi), 1)


def mock_financial_profile() -> dict:
    return {
        "player_id": str(uuid.uuid4()),
        "profile_version": "1.0",
        "last_updated": datetime.utcnow().isoformat(),
        "synthetic": True,
        "financial_literacy": {
            "overall_score": _r(40, 95),
            "budgeting_score": _r(30, 95),
            "savings_score": _r(30, 95),
            "credit_debt_score": _r(30, 95),
            "investment_score": _r(30, 95),
            "insurance_score": _r(30, 95),
            "tax_score": _r(30, 95),
            "confidence_vs_competence_gap": _r(-20, 20),
        },
        "money_management_style": {
            "spending_discipline": _r(20, 90),
            "impulse_purchase_rate": _r(5, 60),
            "budget_adherence_rate": _r(20, 90),
            "emergency_fund_behavior": random.choice(["none", "reactive", "proactive", "disciplined"]),
            "avg_days_to_spend_windfall": None,  # not modeled even in mock data -- see NOT_AVAILABLE_FIELDS
        },
        "savings_behavior": {k: None for k in
                              ["savings_rate_pct", "goal_setting_frequency", "goal_completion_rate",
                               "preferred_savings_horizon", "auto_save_adoption"]},
        "risk_and_investment": {
            "risk_tolerance_score": _r(10, 90),
            "risk_capacity_vs_appetite_gap": None,
            "diversification_tendency": None,
            "panic_sell_incidents": None,
            "buy_high_sell_low_incidents": None,
            "preferred_asset_classes": [],
            "holding_period_avg_days": None,
        },
        "debt_and_credit": {k: None for k in
                             ["debt_taken_count", "on_time_repayment_rate", "credit_utilization_avg",
                              "loan_purpose_distribution", "over_leverage_incidents"]},
        "product_affinity": {
            "insurance_engagement": random.randint(0, 8),
            "tax_planning_engagement": random.randint(0, 8),
            "retirement_planning_engagement": random.randint(0, 8),
            "digital_banking_comfort": random.randint(0, 8),
        },
        "quest_history": [
            {
                "quest_id": qid,
                "quest_type": random.choice(["budgeting", "investing", "debt", "insurance", "tax", "savings"]),
                "completed_at": (datetime.utcnow() - timedelta(days=random.randint(0, 20))).isoformat(),
                "outcome_score": _r(40, 100),
                "decisions_log": [random.randint(1, 500) for _ in range(random.randint(1, 3))],
            }
            for qid in random.sample(
                ["aadhaar", "pan", "bank", "store", "hospital", "atm_pin", "upi_payment", "passbook"],
                k=random.randint(2, 5),
            )
        ],
        "segment_tags": random.sample(SEGMENT_TAGS_POOL, k=random.randint(1, 3)),
    }


def mock_behavioral_profile() -> dict:
    return {
        "player_id": str(uuid.uuid4()),
        "profile_version": "1.0",
        "last_updated": datetime.utcnow().isoformat(),
        "synthetic": True,
        "sample_size": {
            "total_decision_points_captured": random.randint(3, 60),
            "confidence_level": random.choice(["low", "medium", "high"]),
        },
        "decision_style": {
            "deliberation_speed": _r(10, 90),
            "avg_decision_time_ms": random.randint(1500, 25000),
            "information_seeking_before_decision": _r(0, 80),
            "decision_reversal_rate": _r(0, 50),
        },
        "risk_psychology": {k: None for k in
                             ["loss_aversion_index", "risk_seeking_under_gain",
                              "risk_seeking_under_loss", "ambiguity_tolerance"]},
        "time_preference": {
            "delayed_gratification_score": _r(10, 90),
            "hyperbolic_discounting_tendency": None,
            "present_bias_score": _r(10, 90),
        },
        "cognitive_biases_detected": {
            "anchoring_susceptibility": None,
            "herd_behavior_susceptibility": None,
            "overconfidence_index": _r(-20, 20),
            "sunk_cost_fallacy_incidents": None,
            "confirmation_bias_score": None,
        },
        "personality_traits_lite": {k: None for k in
                                     ["conscientiousness", "openness_to_new_products",
                                      "emotional_reactivity_to_loss", "locus_of_control"]},
        "social_and_influence": {
            "susceptibility_to_npc_advice": _r(0, 100),
            "susceptibility_to_peer_leaderboard": None,
            "independent_vs_guided_choice_ratio": _r(0, 100),
        },
        "stress_response": {
            "decision_quality_under_time_pressure": None,
            "decision_quality_after_loss_event": None,
            "quits_or_avoids_difficult_quests": None,
        },
        "trait_summary_tags": random.sample(TRAIT_TAGS_POOL, k=random.randint(1, 3)),
    }