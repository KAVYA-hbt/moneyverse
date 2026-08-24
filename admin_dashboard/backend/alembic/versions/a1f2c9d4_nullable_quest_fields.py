"""quest_history.quest_type / outcome_score nullable

Revision ID: a1f2c9d4
Revises: ce5b3787
Create Date: 2026-08-16

Real game telemetry (see app/import_profiles.py) doesn't always classify a quest's type or
score at completion time -- these become nullable so the API/UI can grey the field out
instead of forcing a fabricated value.
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "a1f2c9d4"
down_revision: Union[str, None] = "ce5b3787"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("quest_history") as batch_op:
        batch_op.alter_column("quest_type", existing_type=sa.String(64), nullable=True)
        batch_op.alter_column("outcome_score", existing_type=sa.Float(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("quest_history") as batch_op:
        batch_op.alter_column("outcome_score", existing_type=sa.Float(), nullable=False)
        batch_op.alter_column("quest_type", existing_type=sa.String(64), nullable=False)
