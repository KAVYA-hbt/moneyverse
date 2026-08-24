import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.common import ConfidenceLevel, FlagBadge, InteractionType


class ProfileListItem(BaseModel):
    player_id: uuid.UUID
    name: str
    segment_tags: list[str]
    current_game_level: int
    last_active_at: datetime
    confidence_level: ConfidenceLevel
    open_mismatch_count: int


class ProfileListResponse(BaseModel):
    items: list[ProfileListItem]
    total: int
    page: int
    page_size: int


class TagCount(BaseModel):
    tag: str
    count: int


class ProfileAnalyticsResponse(BaseModel):
    total_players: int
    # confidence_level -> count. Always has all three keys (low/medium/high), 0 where empty, so
    # the frontend chart doesn't need to special-case a missing bucket.
    confidence_breakdown: dict[str, int]
    # Sorted descending by count. financial_profile.segment_tags across the cohort.
    segment_tag_counts: list[TagCount]
    # Sorted descending by count. psychometric_profile.trait_summary_tags across the cohort.
    trait_tag_counts: list[TagCount]
    # Sorted descending by count. Pools two different shapes of interest signal (see
    # app/routers/profiles.py::_accumulate_product_interest): real telemetry's
    # product_affinity.*_engagement/_comfort category counts, and synthetic/seed data's
    # product_affinity.top_products / risk_and_investment.preferred_instruments product-name
    # lists -- entries here are therefore a mix of category labels ("insurance") and specific
    # product names ("SIP-Mutual-Fund") depending on which players contributed to them.
    product_interest_counts: list[TagCount]


class PlayerOut(BaseModel):
    id: uuid.UUID
    external_game_id: str
    name: str
    signup_date: datetime
    last_active_at: datetime
    current_game_level: int
    minor_flag: bool
    consent_status: dict[str, Any]


class MismatchOut(BaseModel):
    id: uuid.UUID
    mismatch_type: str
    description: str
    detected_at: datetime
    resolved: bool


class ProfileDetailResponse(BaseModel):
    player: PlayerOut
    financial_profile: dict[str, Any]
    psychometric_profile: dict[str, Any]
    segment_tags: list[str]
    confidence_level: ConfidenceLevel
    confidence_score: float
    open_mismatches: list[MismatchOut]


class TopQuest(BaseModel):
    quest_id: str
    # Nullable: real game telemetry doesn't always classify a quest's type/score at
    # completion time -- the frontend greys these fields out rather than showing a fake value.
    quest_type: str | None
    completed_at: datetime
    outcome_score: float | None


class TopInteraction(BaseModel):
    interaction_type: InteractionType
    product_discussed: str | None = None
    occurred_at: datetime
    summary_text: str


class ProfileSummaryResponse(BaseModel):
    player_id: uuid.UUID
    name: str
    segment_tags: list[str]
    top_quests: list[TopQuest]
    top_interactions: list[TopInteraction]
    active_flags: list[FlagBadge]


class ProfileAiSummaryResponse(BaseModel):
    summary_text: str
    based_on: list[str]
    generated_at: datetime
    is_cached: bool


class OverrideRequest(BaseModel):
    field_path: str
    new_value: Any
    reason: str


class OverrideResponse(BaseModel):
    success: bool
    audit_log_id: uuid.UUID
