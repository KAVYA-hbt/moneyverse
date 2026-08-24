import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin, require_role
from app.models.models import AdminUser, HandoffCase, HandoffResolution, HandoffTranscript, Player
from app.schemas.common import FlagBadge
from app.schemas.handoffs import (
    EscalateRequest,
    HandoffCaseOut,
    HandoffDetailResponse,
    HandoffListResponse,
    HandoffQueueItem,
    ResolutionOut,
    ResolveRequest,
    SendBackRequest,
    SuccessResponse,
    TranscriptMessageOut,
)
from app.routers.profiles import _build_profile_summary
from app.services.audit import write_audit_log
from app.services.handoff_access import apply_handoff_tier_filter, can_access_case
from app.services.pubsub import publish_event

router = APIRouter(prefix="/api/handoffs", tags=["handoffs"])

TRIGGER_TO_FLAG_KIND = {
    "distress_language": "distress",
    "dpdp_request": "compliance",
    "bot_confusion": "mismatch",
    "high_value_decision": "compliance",
    "explicit_human_request": "mismatch",
}


def _case_to_out(case: HandoffCase) -> HandoffCaseOut:
    return HandoffCaseOut(
        id=case.id,
        player_id=case.player_id,
        trigger_reason=case.trigger_reason,
        tier_required=case.tier_required,
        status=case.status,
        assigned_admin_id=case.assigned_admin_id,
        created_at=case.created_at,
        claimed_at=case.claimed_at,
        resolved_at=case.resolved_at,
        bot_reasoning_text=case.bot_reasoning_text,
        escalation_source=case.escalation_source,
        escalated_by_admin_id=case.escalated_by_admin_id,
        escalation_reason_text=case.escalation_reason_text,
    )


async def _get_case_or_404(db: AsyncSession, case_id: uuid.UUID) -> HandoffCase:
    case = await db.get(HandoffCase, case_id)
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handoff case not found")
    return case


@router.get("", response_model=HandoffListResponse)
async def list_handoffs(
    status_filter: str | None = Query(None, alias="status"),
    trigger_reason: str | None = Query(None),
    assigned_admin_id: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> HandoffListResponse:
    query = select(HandoffCase, Player.name).join(Player, Player.id == HandoffCase.player_id)
    query = apply_handoff_tier_filter(query, admin)

    if status_filter:
        query = query.where(HandoffCase.status == status_filter)
    if trigger_reason:
        query = query.where(HandoffCase.trigger_reason == trigger_reason)
    if assigned_admin_id:
        query = query.where(HandoffCase.assigned_admin_id == assigned_admin_id)

    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(HandoffCase.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(query)).all()

    items = [
        HandoffQueueItem(
            id=case.id,
            player_id=case.player_id,
            player_name=player_name,
            trigger_reason=case.trigger_reason,
            tier_required=case.tier_required,
            status=case.status,
            assigned_admin_id=case.assigned_admin_id,
            created_at=case.created_at,
            active_flags=[
                FlagBadge(
                    kind=TRIGGER_TO_FLAG_KIND.get(case.trigger_reason, "mismatch"),
                    label=case.trigger_reason.replace("_", " ").title(),
                )
            ],
        )
        for case, player_name in rows
    ]

    return HandoffListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{case_id}", response_model=HandoffDetailResponse)
async def get_handoff(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> HandoffDetailResponse:
    case = await _get_case_or_404(db, case_id)
    if not can_access_case(admin, case):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this case")

    transcript_result = await db.execute(
        select(HandoffTranscript)
        .where(HandoffTranscript.handoff_case_id == case_id)
        .order_by(HandoffTranscript.sent_at)
    )
    transcript = [
        TranscriptMessageOut(
            id=m.id,
            sender=m.sender,
            message_text=m.message_text,
            sent_at=m.sent_at,
            is_trigger_message=m.is_trigger_message,
        )
        for m in transcript_result.scalars().all()
    ]

    player = await db.get(Player, case.player_id)
    profile_summary = await _build_profile_summary(db, player)

    resolution = await db.get(HandoffResolution, case_id)
    resolution_out = (
        ResolutionOut(
            outcome=resolution.outcome,
            time_to_resolution_seconds=resolution.time_to_resolution_seconds,
            notes=resolution.notes,
            resolved_by_admin_id=resolution.resolved_by_admin_id,
        )
        if resolution
        else None
    )

    return HandoffDetailResponse(
        case=_case_to_out(case),
        transcript=transcript,
        profile_summary=profile_summary,
        resolution=resolution_out,
    )


@router.post("/{case_id}/claim", response_model=HandoffCaseOut)
async def claim_handoff(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_role("tier1_admin", "tier2_admin")),
) -> HandoffCaseOut:
    case = await _get_case_or_404(db, case_id)
    if not can_access_case(admin, case):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this case")
    if case.status != "open":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Case is not open")

    case.status = "claimed"
    case.assigned_admin_id = admin.id
    case.claimed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(case)

    await publish_event(
        {"type": "case_claimed", "case_id": str(case.id), "assigned_admin_id": str(admin.id)}
    )

    return _case_to_out(case)


@router.post("/{case_id}/resolve", response_model=SuccessResponse)
async def resolve_handoff(
    case_id: uuid.UUID,
    payload: ResolveRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_role("tier1_admin", "tier2_admin")),
) -> SuccessResponse:
    case = await _get_case_or_404(db, case_id)
    if not can_access_case(admin, case):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this case")
    if case.status == "resolved":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Case already resolved")

    now = datetime.now(timezone.utc)
    time_to_resolution = int((now - case.created_at).total_seconds())

    case.status = "resolved"
    case.resolved_at = now

    resolution = HandoffResolution(
        handoff_case_id=case.id,
        outcome=payload.outcome,
        time_to_resolution_seconds=time_to_resolution,
        notes=payload.notes,
        resolved_by_admin_id=admin.id,
    )
    db.add(resolution)
    await db.commit()

    await publish_event({"type": "case_updated", "case_id": str(case.id)})

    return SuccessResponse(success=True)


@router.post("/{case_id}/escalate", response_model=HandoffCaseOut)
async def escalate_handoff(
    case_id: uuid.UUID,
    payload: EscalateRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_role("tier1_admin")),
) -> HandoffCaseOut:
    case = await _get_case_or_404(db, case_id)
    if not can_access_case(admin, case):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this case")

    case.tier_required = 2
    case.escalation_source = "manual"
    case.escalated_by_admin_id = admin.id
    case.escalation_reason_text = payload.escalation_reason_text

    await write_audit_log(
        db,
        admin_id=admin.id,
        action_type="escalation",
        target_type="handoff_case",
        target_id=str(case.id),
        details={"escalation_reason_text": payload.escalation_reason_text},
    )

    await db.commit()
    await db.refresh(case)

    await publish_event({"type": "case_updated", "case_id": str(case.id)})

    return _case_to_out(case)


@router.post("/{case_id}/send-back", response_model=SuccessResponse)
async def send_back_handoff(
    case_id: uuid.UUID,
    payload: SendBackRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_role("tier1_admin", "tier2_admin")),
) -> SuccessResponse:
    case = await _get_case_or_404(db, case_id)
    if not can_access_case(admin, case):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this case")

    case.status = "open"
    case.assigned_admin_id = None
    case.claimed_at = None

    db.add(
        HandoffTranscript(
            handoff_case_id=case.id,
            sender="bot",
            message_text=f"[Sent back by admin] {payload.note}",
            sent_at=datetime.now(timezone.utc),
            is_trigger_message=False,
        )
    )

    await db.commit()

    await publish_event({"type": "case_updated", "case_id": str(case.id)})

    return SuccessResponse(success=True)
