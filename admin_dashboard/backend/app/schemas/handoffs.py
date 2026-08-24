import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import EscalationSource, FlagBadge, HandoffStatus, TriggerReason
from app.schemas.profiles import ProfileSummaryResponse


class HandoffQueueItem(BaseModel):
    id: uuid.UUID
    player_id: uuid.UUID
    player_name: str
    trigger_reason: TriggerReason
    tier_required: int
    status: HandoffStatus
    assigned_admin_id: uuid.UUID | None
    created_at: datetime
    active_flags: list[FlagBadge]


class HandoffListResponse(BaseModel):
    items: list[HandoffQueueItem]
    total: int
    page: int
    page_size: int


class HandoffCaseOut(BaseModel):
    id: uuid.UUID
    player_id: uuid.UUID
    trigger_reason: TriggerReason
    tier_required: int
    status: HandoffStatus
    assigned_admin_id: uuid.UUID | None
    created_at: datetime
    claimed_at: datetime | None
    resolved_at: datetime | None
    bot_reasoning_text: str
    escalation_source: EscalationSource | None
    escalated_by_admin_id: uuid.UUID | None
    escalation_reason_text: str | None


class TranscriptMessageOut(BaseModel):
    id: uuid.UUID
    sender: str
    message_text: str
    sent_at: datetime
    is_trigger_message: bool


class ResolutionOut(BaseModel):
    outcome: str
    time_to_resolution_seconds: int
    notes: str
    resolved_by_admin_id: uuid.UUID


class HandoffDetailResponse(BaseModel):
    case: HandoffCaseOut
    transcript: list[TranscriptMessageOut]
    profile_summary: ProfileSummaryResponse
    resolution: ResolutionOut | None


class ResolveRequest(BaseModel):
    outcome: str
    notes: str


class SuccessResponse(BaseModel):
    success: bool


class EscalateRequest(BaseModel):
    escalation_reason_text: str


class SendBackRequest(BaseModel):
    note: str
