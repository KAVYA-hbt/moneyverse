from typing import Any, Literal

from pydantic import BaseModel

Role = Literal["tier1_admin", "tier2_admin", "product_analyst"]
TriggerReason = Literal[
    "bot_confusion",
    "distress_language",
    "dpdp_request",
    "high_value_decision",
    "explicit_human_request",
]
HandoffStatus = Literal["open", "claimed", "resolved"]
EscalationSource = Literal["auto", "manual"]
InteractionType = Literal["recommendation", "chat", "advisory_session"]
ConfidenceLevel = Literal["low", "medium", "high"]
FlagKind = Literal["mismatch", "distress", "compliance"]


class FlagBadge(BaseModel):
    kind: FlagKind
    label: str
    detail: str | None = None


class ErrorResponse(BaseModel):
    detail: str
