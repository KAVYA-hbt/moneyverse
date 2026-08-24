"""initial schema

Revision ID: ce5b3787
Revises:
Create Date: 2026-08-15

Uses portable column types (GUID / JSON / generic Enum, see app/models/types.py) so this
migration runs unchanged on both the SQLite dev default and a PostgreSQL production database.
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op
from app.models.types import GUID, JSONType

# revision identifiers, used by Alembic.
revision: str = "ce5b3787"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ADMIN_ROLE = ("tier1_admin", "tier2_admin", "product_analyst")
TRIGGER_REASON = (
    "bot_confusion", "distress_language", "dpdp_request", "high_value_decision",
    "explicit_human_request",
)
HANDOFF_STATUS = ("open", "claimed", "resolved")
ESCALATION_SOURCE = ("auto", "manual")
INTERACTION_TYPE = ("recommendation", "chat", "advisory_session")
SENDER = ("player", "bot")
AUDIT_ACTION_TYPE = ("field_override", "export", "tier2_access", "escalation")


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("role", sa.Enum(*ADMIN_ROLE, name="admin_role"), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "players",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("external_game_id", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("phone_or_email", sa.Text(), nullable=False),
        sa.Column("signup_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_game_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("minor_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("consent_status", JSONType, nullable=False, server_default="{}"),
    )
    # NOTE: players.phone_or_email is plaintext for local dev; production should encrypt at rest
    # (app-level envelope encryption via KMS) rather than relying on column-level pgcrypto here.

    op.create_table(
        "financial_profiles",
        sa.Column("player_id", GUID(), sa.ForeignKey("players.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("profile_json", JSONType, nullable=False, server_default="{}"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ai_summary_text", sa.Text(), nullable=True),
        sa.Column("ai_summary_based_on", JSONType, nullable=True),
        sa.Column("last_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_hash", sa.String(64), nullable=True),
    )

    op.create_table(
        "psychometric_profiles",
        sa.Column("player_id", GUID(), sa.ForeignKey("players.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("profile_json", JSONType, nullable=False, server_default="{}"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "quest_history",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("player_id", GUID(), sa.ForeignKey("players.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quest_id", sa.String(64), nullable=False),
        sa.Column("quest_type", sa.String(64), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("outcome_score", sa.Float(), nullable=False),
        sa.Column("decisions_log", JSONType, nullable=False, server_default="[]"),
    )
    op.create_index("ix_quest_history_player_id", "quest_history", ["player_id"])

    op.create_table(
        "finguru_interactions",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("player_id", GUID(), sa.ForeignKey("players.id", ondelete="CASCADE"), nullable=False),
        sa.Column("interaction_type", sa.Enum(*INTERACTION_TYPE, name="interaction_type"), nullable=False),
        sa.Column("summary_text", sa.Text(), nullable=False),
        sa.Column("product_discussed", sa.String(128), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("raw_transcript_ref", sa.String(255), nullable=True),
    )
    op.create_index("ix_finguru_interactions_player_id", "finguru_interactions", ["player_id"])

    op.create_table(
        "profile_mismatches",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("player_id", GUID(), sa.ForeignKey("players.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mismatch_type", sa.String(128), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_profile_mismatches_player_id", "profile_mismatches", ["player_id"])

    op.create_table(
        "handoff_cases",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("player_id", GUID(), sa.ForeignKey("players.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trigger_reason", sa.Enum(*TRIGGER_REASON, name="trigger_reason"), nullable=False),
        sa.Column("tier_required", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum(*HANDOFF_STATUS, name="handoff_status"), nullable=False, server_default="open"),
        sa.Column("assigned_admin_id", GUID(), sa.ForeignKey("admin_users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bot_reasoning_text", sa.Text(), nullable=False),
        sa.Column("escalation_source", sa.Enum(*ESCALATION_SOURCE, name="escalation_source"), nullable=True),
        sa.Column("escalated_by_admin_id", GUID(), sa.ForeignKey("admin_users.id"), nullable=True),
        sa.Column("escalation_reason_text", sa.Text(), nullable=True),
    )
    op.create_index("ix_handoff_cases_player_id", "handoff_cases", ["player_id"])
    op.create_index("ix_handoff_cases_status", "handoff_cases", ["status"])
    op.create_index("ix_handoff_cases_tier_required", "handoff_cases", ["tier_required"])

    op.create_table(
        "handoff_transcripts",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("handoff_case_id", GUID(), sa.ForeignKey("handoff_cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender", sa.Enum(*SENDER, name="sender"), nullable=False),
        sa.Column("message_text", sa.Text(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_trigger_message", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_handoff_transcripts_case_id", "handoff_transcripts", ["handoff_case_id"])

    op.create_table(
        "handoff_resolutions",
        sa.Column("handoff_case_id", GUID(), sa.ForeignKey("handoff_cases.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("outcome", sa.String(255), nullable=False),
        sa.Column("time_to_resolution_seconds", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("resolved_by_admin_id", GUID(), sa.ForeignKey("admin_users.id"), nullable=False),
    )

    op.create_table(
        "audit_log",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("admin_id", GUID(), sa.ForeignKey("admin_users.id"), nullable=False),
        sa.Column("action_type", sa.Enum(*AUDIT_ACTION_TYPE, name="audit_action_type"), nullable=False),
        sa.Column("target_type", sa.String(64), nullable=False),
        sa.Column("target_id", sa.String(128), nullable=False),
        sa.Column("details", JSONType, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_log_admin_id", "audit_log", ["admin_id"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("handoff_resolutions")
    op.drop_table("handoff_transcripts")
    op.drop_table("handoff_cases")
    op.drop_table("profile_mismatches")
    op.drop_table("finguru_interactions")
    op.drop_table("quest_history")
    op.drop_table("psychometric_profiles")
    op.drop_table("financial_profiles")
    op.drop_table("players")
    op.drop_table("admin_users")
