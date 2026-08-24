import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import Enum as PgEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import GUID, JSONType

# --- Enum value sets (kept as plain strings in DB via PgEnum for readability in psql) ---
ROLE_VALUES = ("tier1_admin", "tier2_admin", "product_analyst")
TRIGGER_REASON_VALUES = (
    "bot_confusion",
    "distress_language",
    "dpdp_request",
    "high_value_decision",
    "explicit_human_request",
)
HANDOFF_STATUS_VALUES = ("open", "claimed", "resolved")
ESCALATION_SOURCE_VALUES = ("auto", "manual")
INTERACTION_TYPE_VALUES = ("recommendation", "chat", "advisory_session")
SENDER_VALUES = ("player", "bot")
AUDIT_ACTION_VALUES = ("field_override", "export", "tier2_access", "escalation")


def _uuid_col():
    return mapped_column(GUID(), primary_key=True, default=uuid.uuid4)


class Player(Base):
    __tablename__ = "players"

    id: Mapped[uuid.UUID] = _uuid_col()
    external_game_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # NOTE: in production this would be encrypted at rest via app-level encryption
    # (e.g. envelope encryption + KMS). Stored as plaintext for local dev simplicity.
    phone_or_email: Mapped[str] = mapped_column(Text, nullable=False)
    signup_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_active_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_game_level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    minor_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    consent_status: Mapped[dict] = mapped_column(JSONType, nullable=False, default=dict)

    financial_profile: Mapped["FinancialProfile"] = relationship(
        back_populates="player", uselist=False, cascade="all, delete-orphan"
    )
    psychometric_profile: Mapped["PsychometricProfile"] = relationship(
        back_populates="player", uselist=False, cascade="all, delete-orphan"
    )
    quest_history: Mapped[list["QuestHistory"]] = relationship(
        back_populates="player", cascade="all, delete-orphan"
    )
    interactions: Mapped[list["FinguruInteraction"]] = relationship(
        back_populates="player", cascade="all, delete-orphan"
    )
    mismatches: Mapped[list["ProfileMismatch"]] = relationship(
        back_populates="player", cascade="all, delete-orphan"
    )
    handoff_cases: Mapped[list["HandoffCase"]] = relationship(
        back_populates="player", cascade="all, delete-orphan"
    )


class FinancialProfile(Base):
    __tablename__ = "financial_profiles"

    player_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("players.id", ondelete="CASCADE"), primary_key=True
    )
    # profile_json keys: financial_literacy, money_management_style, savings_behavior,
    # risk_and_investment, debt_and_credit, product_affinity, segment_tags
    profile_json: Mapped[dict] = mapped_column(JSONType, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # AI summary cache (supports GET /api/profiles/{id}/summary/ai caching requirement)
    ai_summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary_based_on: Mapped[list | None] = mapped_column(JSONType, nullable=True)
    last_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    player: Mapped["Player"] = relationship(back_populates="financial_profile")


class PsychometricProfile(Base):
    __tablename__ = "psychometric_profiles"

    player_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("players.id", ondelete="CASCADE"), primary_key=True
    )
    # profile_json keys: decision_style, risk_psychology, time_preference,
    # cognitive_biases_detected, personality_traits_lite, social_and_influence,
    # stress_response, trait_summary_tags, sample_size
    profile_json: Mapped[dict] = mapped_column(JSONType, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    player: Mapped["Player"] = relationship(back_populates="psychometric_profile")


class QuestHistory(Base):
    __tablename__ = "quest_history"

    id: Mapped[uuid.UUID] = _uuid_col()
    player_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False
    )
    quest_id: Mapped[str] = mapped_column(String(64), nullable=False)
    # Nullable: real game telemetry doesn't always classify a quest's type or score at
    # completion time (see app/import_profiles.py) -- the API/UI grey these out rather than
    # fabricating a value.
    quest_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    outcome_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    decisions_log: Mapped[list] = mapped_column(JSONType, nullable=False, default=list)

    player: Mapped["Player"] = relationship(back_populates="quest_history")


class FinguruInteraction(Base):
    __tablename__ = "finguru_interactions"

    id: Mapped[uuid.UUID] = _uuid_col()
    player_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False
    )
    interaction_type: Mapped[str] = mapped_column(
        PgEnum(*INTERACTION_TYPE_VALUES, name="interaction_type"), nullable=False
    )
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    product_discussed: Mapped[str | None] = mapped_column(String(128), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    raw_transcript_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)

    player: Mapped["Player"] = relationship(back_populates="interactions")


class ProfileMismatch(Base):
    __tablename__ = "profile_mismatches"

    id: Mapped[uuid.UUID] = _uuid_col()
    player_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False
    )
    mismatch_type: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    player: Mapped["Player"] = relationship(back_populates="mismatches")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[uuid.UUID] = _uuid_col()
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(PgEnum(*ROLE_VALUES, name="admin_role"), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class HandoffCase(Base):
    __tablename__ = "handoff_cases"

    id: Mapped[uuid.UUID] = _uuid_col()
    player_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False
    )
    trigger_reason: Mapped[str] = mapped_column(
        PgEnum(*TRIGGER_REASON_VALUES, name="trigger_reason"), nullable=False
    )
    tier_required: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        PgEnum(*HANDOFF_STATUS_VALUES, name="handoff_status"), nullable=False, default="open"
    )
    assigned_admin_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("admin_users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    bot_reasoning_text: Mapped[str] = mapped_column(Text, nullable=False)
    escalation_source: Mapped[str | None] = mapped_column(
        PgEnum(*ESCALATION_SOURCE_VALUES, name="escalation_source"), nullable=True
    )
    escalated_by_admin_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("admin_users.id"), nullable=True
    )
    escalation_reason_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    player: Mapped["Player"] = relationship(back_populates="handoff_cases")
    transcript: Mapped[list["HandoffTranscript"]] = relationship(
        back_populates="case", cascade="all, delete-orphan", order_by="HandoffTranscript.sent_at"
    )
    resolution: Mapped["HandoffResolution"] = relationship(
        back_populates="case", uselist=False, cascade="all, delete-orphan"
    )


class HandoffTranscript(Base):
    __tablename__ = "handoff_transcripts"

    id: Mapped[uuid.UUID] = _uuid_col()
    handoff_case_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("handoff_cases.id", ondelete="CASCADE"), nullable=False
    )
    sender: Mapped[str] = mapped_column(PgEnum(*SENDER_VALUES, name="sender"), nullable=False)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_trigger_message: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    case: Mapped["HandoffCase"] = relationship(back_populates="transcript")


class HandoffResolution(Base):
    __tablename__ = "handoff_resolutions"

    handoff_case_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("handoff_cases.id", ondelete="CASCADE"), primary_key=True
    )
    outcome: Mapped[str] = mapped_column(String(255), nullable=False)
    time_to_resolution_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False)
    resolved_by_admin_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("admin_users.id"), nullable=False
    )

    case: Mapped["HandoffCase"] = relationship(back_populates="resolution")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = _uuid_col()
    admin_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("admin_users.id"), nullable=False
    )
    action_type: Mapped[str] = mapped_column(
        PgEnum(*AUDIT_ACTION_VALUES, name="audit_action_type"), nullable=False
    )
    target_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_id: Mapped[str] = mapped_column(String(128), nullable=False)
    details: Mapped[dict] = mapped_column(JSONType, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
