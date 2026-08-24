"""confidence_level derivation: low <5 quests, medium 5-14, high >=15 quest_history rows.

The contract also references psychometric sample_size as a comparison point; we treat the
quest_history count as the ground-truth signal (it is the count of actual observed quest
completions), and confidence_score is simply that count normalized against the high-tier
threshold (15), capped at 1.0.
"""


def compute_confidence(quest_count: int) -> tuple[str, float]:
    if quest_count < 5:
        level = "low"
    elif quest_count < 15:
        level = "medium"
    else:
        level = "high"
    score = min(quest_count / 15.0, 1.0)
    return level, round(score, 2)
