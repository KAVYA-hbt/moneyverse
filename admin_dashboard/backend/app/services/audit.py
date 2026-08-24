import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AuditLog


async def write_audit_log(
    db: AsyncSession,
    admin_id: uuid.UUID,
    action_type: str,
    target_type: str,
    target_id: str,
    details: dict,
) -> AuditLog:
    entry = AuditLog(
        admin_id=admin_id,
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        details=details,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    await db.flush()
    return entry
