"""Row-level access rule for handoff_cases / handoff_transcripts (see API_CONTRACT.md).

For a tier1_admin: tier_required = 1 OR escalated_by_admin_id = <self>.
tier2_admin and product_analyst see everything.

This is implemented as a reusable SQLAlchemy filter applied to every query touching
handoff_cases (list, detail, claim, resolve, escalate, send-back) so the rule cannot be
bypassed by a router that forgets an `if` check.
"""

from sqlalchemy import or_
from sqlalchemy.sql import ColumnElement

from app.models.models import AdminUser, HandoffCase


def handoff_tier_filter(admin: AdminUser) -> ColumnElement | None:
    """Return a SQLAlchemy filter expression to AND onto a HandoffCase query, or None if
    the admin's role has unrestricted access (tier2_admin, product_analyst)."""
    if admin.role == "tier1_admin":
        return or_(
            HandoffCase.tier_required == 1,
            HandoffCase.escalated_by_admin_id == admin.id,
        )
    return None


def apply_handoff_tier_filter(query, admin: AdminUser):
    condition = handoff_tier_filter(admin)
    if condition is not None:
        query = query.where(condition)
    return query


def can_access_case(admin: AdminUser, case: HandoffCase) -> bool:
    if admin.role == "tier1_admin":
        return case.tier_required == 1 or case.escalated_by_admin_id == admin.id
    return True
