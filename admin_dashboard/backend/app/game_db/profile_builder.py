"""Async port of the game backend's own app/profile_builder.py (moneyverse/backend/app/profile_builder.py),
adapted to query the game's Postgres DB directly via this app's async session instead of a sync
ORM Session. The scoring/aggregation logic itself is a deliberate line-for-line port -- kept in
sync BY HAND against the original. If the game's scoring formulas change, this must be updated
to match, or the two profiles (what the game's own API would report vs. what this shows) will
silently drift apart.

See the original file's docstring for what each field means: every field is either (a) a direct
aggregate of something the game actually captures, (b) an explicitly-labeled heuristic proxy, or
(c) None for anything the game has no mechanic to measure at all -- see NOT_AVAILABLE_FIELDS.
"""

from collections import defaultdict
from statistics import mean

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.game_db.models import GameAdvisoryChoice, GamePlayer, GameQuestCompletion, GameQuizAttempt

DISCIPLINE_SCORE = {
    "spend": 0.0, "trip": 0.0, "upgrade": 0.0, "reckless": 0.0,
    "compromise": 0.5, "balanced": 0.5,
    "save": 1.0, "stiff": 1.0,
}

CATEGORY_KEYS = ["budgeting", "savings", "credit_debt", "investment", "insurance", "tax"]

NOT_AVAILABLE_FIELDS = {
    "financial_behavior": [
        "savings_behavior.savings_rate_pct", "savings_behavior.goal_setting_frequency",
        "savings_behavior.goal_completion_rate", "savings_behavior.preferred_savings_horizon",
        "savings_behavior.auto_save_adoption",
        "risk_and_investment.diversification_tendency", "risk_and_investment.panic_sell_incidents",
        "risk_and_investment.buy_high_sell_low_incidents", "risk_and_investment.holding_period_avg_days",
        "debt_and_credit.debt_taken_count", "debt_and_credit.on_time_repayment_rate",
        "debt_and_credit.credit_utilization_avg", "debt_and_credit.loan_purpose_distribution",
        "debt_and_credit.over_leverage_incidents",
    ],
    "psychometric": [
        "risk_psychology.*", "cognitive_biases_detected.anchoring_susceptibility",
        "cognitive_biases_detected.herd_behavior_susceptibility",
        "cognitive_biases_detected.sunk_cost_fallacy_incidents",
        "cognitive_biases_detected.confirmation_bias_score",
        "personality_traits_lite.*",
        "time_preference.hyperbolic_discounting_tendency",
        "social_and_influence.susceptibility_to_peer_leaderboard",
        "stress_response.decision_quality_under_time_pressure",
        "stress_response.decision_quality_after_loss_event",
        "stress_response.quits_or_avoids_difficult_quests",
    ],
}


def _pct(numerator, denominator):
    if not denominator:
        return None
    return round(100 * numerator / denominator, 1)


async def fetch_player_data(session: AsyncSession, player: GamePlayer):
    """One round trip per table for this player -- financial + behavioral profiles are built
    from the same three result sets, so callers should fetch once and pass to both builders."""
    quiz_attempts = (
        await session.execute(select(GameQuizAttempt).where(GameQuizAttempt.player_id == player.id))
    ).scalars().all()
    advisory = (
        await session.execute(select(GameAdvisoryChoice).where(GameAdvisoryChoice.player_id == player.id))
    ).scalars().all()
    completions = (
        await session.execute(select(GameQuestCompletion).where(GameQuestCompletion.player_id == player.id))
    ).scalars().all()
    return quiz_attempts, advisory, completions


def build_financial_profile(player: GamePlayer, quiz_attempts, advisory, completions) -> dict:
    by_category = defaultdict(list)
    all_scored = []
    for a in quiz_attempts:
        if a.is_correct is None:
            continue
        all_scored.append(a.is_correct)
        if a.topic_category and a.topic_category in CATEGORY_KEYS:
            by_category[a.topic_category].append(a.is_correct)

    literacy = {f"{c}_score": (_pct(sum(by_category[c]), len(by_category[c])) if by_category[c] else None)
                for c in CATEGORY_KEYS}
    literacy["overall_score"] = _pct(sum(all_scored), len(all_scored))

    correct_latency = [a.decision_latency_ms for a in quiz_attempts if a.is_correct and a.decision_latency_ms]
    wrong_latency = [a.decision_latency_ms for a in quiz_attempts if a.is_correct is False and a.decision_latency_ms]
    gap = None
    if correct_latency and wrong_latency:
        gap = round(100 * (mean(correct_latency) - mean(wrong_latency)) / mean(correct_latency), 1)
    literacy["confidence_vs_competence_gap"] = gap

    scored_choices = [(c, DISCIPLINE_SCORE[c.choice_value]) for c in advisory if c.choice_value in DISCIPLINE_SCORE]
    scores = [s for _, s in scored_choices]
    style = {
        "spending_discipline": round(100 * mean(scores), 1) if scores else None,
        "impulse_purchase_rate": _pct(sum(1 for s in scores if s == 0.0), len(scores)) if scores else None,
        "budget_adherence_rate": _pct(sum(1 for s in scores if s > 0.0), len(scores)) if scores else None,
        "emergency_fund_behavior": (
            "disciplined" if scores and mean(scores) >= 0.7 else
            "proactive" if scores and mean(scores) >= 0.4 else
            "reactive" if scores and mean(scores) > 0 else
            "none" if scores else None
        ),
        "avg_days_to_spend_windfall": None,
    }

    savings_behavior = {k: None for k in
                         ["savings_rate_pct", "goal_setting_frequency", "goal_completion_rate",
                          "preferred_savings_horizon", "auto_save_adoption"]}

    risk_and_investment = {
        "risk_tolerance_score": (
            round(100 * mean(s for c, s in scored_choices if c.npc_id == "aahan"), 1)
            if any(c.npc_id == "aahan" for c, _ in scored_choices) else None
        ),
        "risk_capacity_vs_appetite_gap": None,
        "diversification_tendency": None,
        "panic_sell_incidents": None,
        "buy_high_sell_low_incidents": None,
        "preferred_asset_classes": [],
        "holding_period_avg_days": None,
    }

    debt_and_credit = {k: None for k in
                        ["debt_taken_count", "on_time_repayment_rate", "credit_utilization_avg",
                         "loan_purpose_distribution", "over_leverage_incidents"]}

    category_counts = defaultdict(int)
    for a in quiz_attempts:
        if a.topic_category:
            category_counts[a.topic_category] += 1
    product_affinity = {
        "insurance_engagement": category_counts.get("insurance", 0),
        "tax_planning_engagement": category_counts.get("tax", 0),
        "retirement_planning_engagement": category_counts.get("investment", 0),
        "digital_banking_comfort": category_counts.get("general", 0),
    }

    quest_history = []
    for q in completions:
        attempts_for_quest = [a for a in quiz_attempts if a.quest_or_treasure_id == q.quest_id]
        scored = [a.is_correct for a in attempts_for_quest if a.is_correct is not None]
        quest_history.append({
            "quest_id": q.quest_id,
            "quest_type": q.quest_type,
            "completed_at": q.completed_at.isoformat() if q.completed_at else None,
            "outcome_score": _pct(sum(scored), len(scored)) if scored else None,
            "decisions_log": [a.id for a in attempts_for_quest],
        })

    tags = []
    if style["spending_discipline"] is not None:
        if style["spending_discipline"] >= 70:
            tags.append("saver")
        if style["impulse_purchase_rate"] and style["impulse_purchase_rate"] > 50:
            tags.append("impulsive_spender")
    if len(completions) >= 5:
        tags.append("goal_oriented")
    if literacy.get("credit_debt_score") is None:
        tags.append("credit_naive")
    if risk_and_investment["risk_tolerance_score"] is not None and risk_and_investment["risk_tolerance_score"] < 30:
        tags.append("risk_averse")

    return {
        "player_id": str(player.id),
        "profile_version": "1.0",
        "last_updated": None,  # set by caller
        "financial_literacy": literacy,
        "money_management_style": style,
        "savings_behavior": savings_behavior,
        "risk_and_investment": risk_and_investment,
        "debt_and_credit": debt_and_credit,
        "product_affinity": product_affinity,
        "quest_history": quest_history,
        "segment_tags": tags,
        "_data_availability": {
            "not_measured_by_current_game": NOT_AVAILABLE_FIELDS["financial_behavior"],
        },
    }


def build_behavioral_profile(player: GamePlayer, quiz_attempts, advisory) -> dict:
    total_points = len(advisory) + len(quiz_attempts)
    confidence = "low" if total_points < 5 else "medium" if total_points < 20 else "high"

    decision_times = [c.decision_time_ms for c in advisory if c.decision_time_ms]
    reversal_flags = [1 if c.reversed_count and c.reversed_count > 0 else 0 for c in advisory]
    hint_flags = [1 if c.robot_hint_used else 0 for c in advisory]

    avg_decision_ms = round(mean(decision_times)) if decision_times else None
    deliberation_speed = min(100, round(100 * avg_decision_ms / 30000)) if avg_decision_ms else None

    decision_style = {
        "deliberation_speed": deliberation_speed,
        "avg_decision_time_ms": avg_decision_ms,
        "information_seeking_before_decision": _pct(sum(hint_flags), len(hint_flags)) if hint_flags else None,
        "decision_reversal_rate": _pct(sum(reversal_flags), len(reversal_flags)) if reversal_flags else None,
    }

    scores = [DISCIPLINE_SCORE.get(c.choice_value) for c in advisory if c.choice_value in DISCIPLINE_SCORE]
    delayed_grat = round(100 * mean(scores), 1) if scores else None
    time_preference = {
        "delayed_gratification_score": delayed_grat,
        "hyperbolic_discounting_tendency": None,
        "present_bias_score": round(100 - delayed_grat, 1) if delayed_grat is not None else None,
    }

    correct_latency = [a.decision_latency_ms for a in quiz_attempts if a.is_correct and a.decision_latency_ms]
    wrong_latency = [a.decision_latency_ms for a in quiz_attempts if a.is_correct is False and a.decision_latency_ms]
    overconfidence = None
    if correct_latency and wrong_latency:
        overconfidence = round(100 * (mean(correct_latency) - mean(wrong_latency)) / mean(correct_latency), 1)

    cognitive_biases = {
        "anchoring_susceptibility": None,
        "herd_behavior_susceptibility": None,
        "overconfidence_index": overconfidence,
        "sunk_cost_fallacy_incidents": None,
        "confirmation_bias_score": None,
    }

    hinted = [c for c in advisory if c.robot_hint_used]
    followed_advice = sum(1 for c in hinted if DISCIPLINE_SCORE.get(c.choice_value, 0) > 0)
    social = {
        "susceptibility_to_npc_advice": _pct(followed_advice, len(hinted)) if hinted else None,
        "susceptibility_to_peer_leaderboard": None,
        "independent_vs_guided_choice_ratio": (
            _pct(len(advisory) - len(hinted), len(advisory)) if advisory else None
        ),
    }

    tags = []
    if delayed_grat is not None and delayed_grat >= 70:
        tags.append("cautious_planner")
    if delayed_grat is not None and delayed_grat < 30:
        tags.append("present_biased")
    if social["susceptibility_to_npc_advice"] is not None and social["susceptibility_to_npc_advice"] >= 70:
        tags.append("advice_dependent")
    if decision_style["decision_reversal_rate"] and decision_style["decision_reversal_rate"] > 40:
        tags.append("deliberate_reconsiderer")

    return {
        "player_id": str(player.id),
        "profile_version": "1.0",
        "last_updated": None,  # set by caller
        "sample_size": {
            "total_decision_points_captured": total_points,
            "confidence_level": confidence,
        },
        "decision_style": decision_style,
        "risk_psychology": {k: None for k in
                             ["loss_aversion_index", "risk_seeking_under_gain",
                              "risk_seeking_under_loss", "ambiguity_tolerance"]},
        "time_preference": time_preference,
        "cognitive_biases_detected": cognitive_biases,
        "personality_traits_lite": {k: None for k in
                                     ["conscientiousness", "openness_to_new_products",
                                      "emotional_reactivity_to_loss", "locus_of_control"]},
        "social_and_influence": social,
        "stress_response": {
            "decision_quality_under_time_pressure": None,
            "decision_quality_after_loss_event": None,
            "quits_or_avoids_difficult_quests": None,
        },
        "trait_summary_tags": tags,
        "_data_availability": {
            "not_measured_by_current_game": NOT_AVAILABLE_FIELDS["psychometric"],
        },
    }
