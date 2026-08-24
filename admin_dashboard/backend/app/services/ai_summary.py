"""Rule-based AI summary generator.

This is a RULE-BASED TEMPLATE stub, not a real LLM call. It composes a one-line summary from
segment_tags + top psychometric traits + current mismatch state. A real LLM call (e.g. via
the Anthropic API) would be swapped in here later per product decision -- the caching contract
(source_hash / last_generated_at on financial_profiles) is designed so that swap only touches
this function, not the caching or router layer.
"""

import hashlib
import json
from typing import Any


def compute_source_hash(financial_profile_json: dict[str, Any], mismatch_state: list[dict[str, Any]]) -> str:
    payload = json.dumps(
        {"financial_profile": financial_profile_json, "mismatches": mismatch_state},
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def generate_summary_text(
    player_name: str,
    financial_profile_json: dict[str, Any],
    psychometric_profile_json: dict[str, Any],
    open_mismatches: list[dict[str, Any]],
) -> tuple[str, list[str]]:
    based_on: list[str] = []

    segment_tags = financial_profile_json.get("segment_tags") or []
    if segment_tags:
        based_on.append("financial_profile.segment_tags")

    trait_tags = psychometric_profile_json.get("trait_summary_tags") or []
    if trait_tags:
        based_on.append("psychometric_profile.trait_summary_tags")

    risk = financial_profile_json.get("risk_and_investment", {})
    risk_label = risk.get("risk_appetite") if isinstance(risk, dict) else None
    if risk_label:
        based_on.append("financial_profile.risk_and_investment")

    parts = [f"{player_name} is"]

    if segment_tags:
        parts.append(f"segmented as {', '.join(segment_tags[:2])}")
    else:
        parts.append("not yet segmented")

    if trait_tags:
        parts.append(f"with dominant traits {', '.join(trait_tags[:2])}")

    if risk_label:
        parts.append(f"and a declared '{risk_label}' risk appetite")

    if open_mismatches:
        based_on.append("profile_mismatches")
        mismatch_types = ", ".join(sorted({m["mismatch_type"] for m in open_mismatches}))
        parts.append(
            f"; {len(open_mismatches)} unresolved mismatch(es) detected ({mismatch_types}) "
            "between declared and revealed behaviour"
        )
    else:
        parts.append("; no unresolved declared-vs-revealed mismatches detected")

    summary_text = " ".join(parts).replace(" ;", ";") + "."
    return summary_text, based_on
