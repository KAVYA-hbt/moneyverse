import json
import uuid
from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_admin, require_role
from app.models.models import (
    AdminUser,
    FinancialProfile,
    FinguruInteraction,
    Player,
    ProfileMismatch,
    PsychometricProfile,
    QuestHistory,
)
from app.schemas.common import FlagBadge
from app.schemas.profiles import (
    MismatchOut,
    OverrideRequest,
    OverrideResponse,
    PlayerOut,
    ProfileAiSummaryResponse,
    ProfileAnalyticsResponse,
    ProfileDetailResponse,
    ProfileListItem,
    ProfileListResponse,
    ProfileSummaryResponse,
    TagCount,
    TopInteraction,
    TopQuest,
)
from app.services import mock_data
from app.services.ai_summary import compute_source_hash, generate_summary_text
from app.services.audit import write_audit_log
from app.services.confidence import compute_confidence

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


async def _get_player_or_404(db: AsyncSession, player_id: uuid.UUID) -> Player:
    player = await db.get(Player, player_id)
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return player


async def _quest_count(db: AsyncSession, player_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count(QuestHistory.id)).where(QuestHistory.player_id == player_id)
    )
    return result.scalar_one()


async def _open_mismatches(db: AsyncSession, player_id: uuid.UUID) -> list[ProfileMismatch]:
    result = await db.execute(
        select(ProfileMismatch)
        .where(ProfileMismatch.player_id == player_id, ProfileMismatch.resolved.is_(False))
        .order_by(ProfileMismatch.detected_at.desc())
    )
    return list(result.scalars().all())


def _accumulate_product_interest(financial_json: dict, counter: Counter[str]) -> None:
    """Pools two different shapes of product-interest signal into one counter, the same way
    segment_tag_counts/trait_tag_counts already mix real-vs-synthetic vocabulary rather than
    forcing a lossy mapping between them:
      - real telemetry: product_affinity.{insurance,tax_planning,retirement_planning}_engagement
        / digital_banking_comfort -- integer quiz-engagement counts per category (see
        moneyverse/backend/app/profile_builder.py / app/game_db/profile_builder.py).
      - synthetic/seed data: product_affinity.top_products / risk_and_investment.preferred_instruments
        -- lists of specific product names (see app/seed.py, app/services/mock_data.py), each
        occurrence counted once.
    Callers get back a mix of category labels ("insurance") and product names
    ("SIP-Mutual-Fund") in the same counter depending on which players contributed to it.
    """
    product_affinity = financial_json.get("product_affinity") or {}
    for key, val in product_affinity.items():
        if key == "top_products" and isinstance(val, list):
            for product in val:
                counter[product] += 1
        elif isinstance(val, (int, float)) and val > 0:
            label = key.replace("_engagement", "").replace("_comfort", "").replace("_", " ")
            counter[label] += int(val)

    risk_and_investment = financial_json.get("risk_and_investment") or {}
    for product in risk_and_investment.get("preferred_instruments") or []:
        counter[product] += 1


def _mock_list_profiles(
    segment: str | None, min_score: float | None, max_score: float | None, page: int, page_size: int
) -> ProfileListResponse:
    items: list[ProfileListItem] = []
    for player in mock_data.list_mock_players():
        segment_tags = player["financial_profile"].get("segment_tags") or []
        if segment and segment not in segment_tags:
            continue

        confidence_level, confidence_score = compute_confidence(player["quest_count"])
        if min_score is not None and confidence_score < min_score:
            continue
        if max_score is not None and confidence_score > max_score:
            continue

        items.append(
            ProfileListItem(
                player_id=player["id"],
                name=player["name"],
                segment_tags=segment_tags,
                current_game_level=player["current_game_level"],
                last_active_at=player["last_active_at"],
                confidence_level=confidence_level,
                open_mismatch_count=len(player["mismatches"]),
            )
        )

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return ProfileListResponse(items=items[start:end], total=total, page=page, page_size=page_size)


def _mock_analytics() -> ProfileAnalyticsResponse:
    confidence_counts = {"low": 0, "medium": 0, "high": 0}
    segment_counter: Counter[str] = Counter()
    trait_counter: Counter[str] = Counter()
    product_counter: Counter[str] = Counter()

    players = mock_data.list_mock_players()
    for player in players:
        confidence_level, _ = compute_confidence(player["quest_count"])
        confidence_counts[confidence_level] += 1
        for tag in player["financial_profile"].get("segment_tags") or []:
            segment_counter[tag] += 1
        for tag in player["psychometric_profile"].get("trait_summary_tags") or []:
            trait_counter[tag] += 1
        _accumulate_product_interest(player["financial_profile"], product_counter)

    return ProfileAnalyticsResponse(
        total_players=len(players),
        confidence_breakdown=confidence_counts,
        segment_tag_counts=[TagCount(tag=t, count=c) for t, c in segment_counter.most_common()],
        trait_tag_counts=[TagCount(tag=t, count=c) for t, c in trait_counter.most_common()],
        product_interest_counts=[TagCount(tag=t, count=c) for t, c in product_counter.most_common()],
    )


def _mock_get_profile(player_id: uuid.UUID) -> ProfileDetailResponse:
    player = mock_data.get_mock_player(player_id)
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")

    confidence_level, confidence_score = compute_confidence(player["quest_count"])
    return ProfileDetailResponse(
        player=PlayerOut(
            id=player["id"],
            external_game_id=player["external_game_id"],
            name=player["name"],
            signup_date=player["signup_date"],
            last_active_at=player["last_active_at"],
            current_game_level=player["current_game_level"],
            minor_flag=player["minor_flag"],
            consent_status=player["consent_status"],
        ),
        financial_profile=player["financial_profile"],
        psychometric_profile=player["psychometric_profile"],
        segment_tags=player["financial_profile"].get("segment_tags") or [],
        confidence_level=confidence_level,
        confidence_score=confidence_score,
        open_mismatches=[
            MismatchOut(
                id=m["id"],
                mismatch_type=m["mismatch_type"],
                description=m["description"],
                detected_at=m["detected_at"],
                resolved=m["resolved"],
            )
            for m in player["mismatches"]
        ],
    )


def _mock_get_profile_summary(player_id: uuid.UUID) -> ProfileSummaryResponse:
    player = mock_data.get_mock_player(player_id)
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")

    active_flags = [FlagBadge(**f) for f in mock_data.mock_active_flags(player)]
    return ProfileSummaryResponse(
        player_id=player["id"],
        name=player["name"],
        segment_tags=player["financial_profile"].get("segment_tags") or [],
        top_quests=[TopQuest(**q) for q in player["quests"][:3]],
        top_interactions=[TopInteraction(**i) for i in player["interactions"][:3]],
        active_flags=active_flags,
    )


@router.get("", response_model=ProfileListResponse)
async def list_profiles(
    segment: str | None = Query(None),
    # min_score/max_score filter on confidence_score (0-1, derived from quest count vs the
    # high-tier threshold) -- the contract names the param but not the metric; confidence_score
    # is the only per-player numeric score this endpoint otherwise surfaces.
    min_score: float | None = Query(None),
    max_score: float | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
) -> ProfileListResponse:
    if settings.use_mock_profiles:
        return _mock_list_profiles(segment, min_score, max_score, page, page_size)

    result = await db.execute(
        select(Player, FinancialProfile).join(
            FinancialProfile, FinancialProfile.player_id == Player.id, isouter=True
        )
    )
    rows = result.all()

    items: list[ProfileListItem] = []
    for player, fin_profile in rows:
        segment_tags = (fin_profile.profile_json.get("segment_tags") if fin_profile else None) or []
        if segment and segment not in segment_tags:
            continue

        quest_count = await _quest_count(db, player.id)
        confidence_level, confidence_score = compute_confidence(quest_count)

        if min_score is not None and confidence_score < min_score:
            continue
        if max_score is not None and confidence_score > max_score:
            continue

        mismatch_count_result = await db.execute(
            select(func.count(ProfileMismatch.id)).where(
                ProfileMismatch.player_id == player.id, ProfileMismatch.resolved.is_(False)
            )
        )
        open_mismatch_count = mismatch_count_result.scalar_one()

        items.append(
            ProfileListItem(
                player_id=player.id,
                name=player.name,
                segment_tags=segment_tags,
                current_game_level=player.current_game_level,
                last_active_at=player.last_active_at,
                confidence_level=confidence_level,
                open_mismatch_count=open_mismatch_count,
            )
        )

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    return ProfileListResponse(items=page_items, total=total, page=page, page_size=page_size)


@router.get("/analytics", response_model=ProfileAnalyticsResponse)
async def get_profile_analytics(
    db: AsyncSession = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
) -> ProfileAnalyticsResponse:
    # Registered before "/{player_id}" -- FastAPI matches path routes in declaration order, and
    # "analytics" would otherwise be swallowed as a player_id UUID (and 422) by that route.
    if settings.use_mock_profiles:
        return _mock_analytics()

    result = await db.execute(
        select(Player, FinancialProfile, PsychometricProfile)
        .join(FinancialProfile, FinancialProfile.player_id == Player.id, isouter=True)
        .join(PsychometricProfile, PsychometricProfile.player_id == Player.id, isouter=True)
    )
    rows = result.all()

    confidence_counts = {"low": 0, "medium": 0, "high": 0}
    segment_counter: Counter[str] = Counter()
    trait_counter: Counter[str] = Counter()
    product_counter: Counter[str] = Counter()

    for player, fin_profile, psych_profile in rows:
        quest_count = await _quest_count(db, player.id)
        confidence_level, _ = compute_confidence(quest_count)
        confidence_counts[confidence_level] += 1

        for tag in (fin_profile.profile_json.get("segment_tags") if fin_profile else None) or []:
            segment_counter[tag] += 1
        for tag in (psych_profile.profile_json.get("trait_summary_tags") if psych_profile else None) or []:
            trait_counter[tag] += 1
        _accumulate_product_interest(fin_profile.profile_json if fin_profile else {}, product_counter)

    return ProfileAnalyticsResponse(
        total_players=len(rows),
        confidence_breakdown=confidence_counts,
        segment_tag_counts=[TagCount(tag=t, count=c) for t, c in segment_counter.most_common()],
        trait_tag_counts=[TagCount(tag=t, count=c) for t, c in trait_counter.most_common()],
        product_interest_counts=[TagCount(tag=t, count=c) for t, c in product_counter.most_common()],
    )


@router.get("/{player_id}", response_model=ProfileDetailResponse)
async def get_profile(
    player_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
) -> ProfileDetailResponse:
    if settings.use_mock_profiles:
        return _mock_get_profile(player_id)

    player = await _get_player_or_404(db, player_id)

    fin_profile = await db.get(FinancialProfile, player_id)
    psych_profile = await db.get(PsychometricProfile, player_id)

    quest_count = await _quest_count(db, player_id)
    confidence_level, confidence_score = compute_confidence(quest_count)

    open_mismatches = await _open_mismatches(db, player_id)

    return ProfileDetailResponse(
        player=PlayerOut(
            id=player.id,
            external_game_id=player.external_game_id,
            name=player.name,
            signup_date=player.signup_date,
            last_active_at=player.last_active_at,
            current_game_level=player.current_game_level,
            minor_flag=player.minor_flag,
            consent_status=player.consent_status,
        ),
        financial_profile=fin_profile.profile_json if fin_profile else {},
        psychometric_profile=psych_profile.profile_json if psych_profile else {},
        segment_tags=(fin_profile.profile_json.get("segment_tags") if fin_profile else None) or [],
        confidence_level=confidence_level,
        confidence_score=confidence_score,
        open_mismatches=[
            MismatchOut(
                id=m.id,
                mismatch_type=m.mismatch_type,
                description=m.description,
                detected_at=m.detected_at,
                resolved=m.resolved,
            )
            for m in open_mismatches
        ],
    )


async def _build_profile_summary(db: AsyncSession, player: Player) -> ProfileSummaryResponse:
    fin_profile = await db.get(FinancialProfile, player.id)
    segment_tags = (fin_profile.profile_json.get("segment_tags") if fin_profile else None) or []

    quests_result = await db.execute(
        select(QuestHistory)
        .where(QuestHistory.player_id == player.id)
        .order_by(QuestHistory.completed_at.desc())
        .limit(5)
    )
    top_quests = [
        TopQuest(
            quest_id=q.quest_id,
            quest_type=q.quest_type,
            completed_at=q.completed_at,
            outcome_score=q.outcome_score,
        )
        for q in quests_result.scalars().all()
    ]

    interactions_result = await db.execute(
        select(FinguruInteraction)
        .where(FinguruInteraction.player_id == player.id)
        .order_by(FinguruInteraction.occurred_at.desc())
        .limit(5)
    )
    top_interactions = [
        TopInteraction(
            interaction_type=i.interaction_type,
            product_discussed=i.product_discussed,
            occurred_at=i.occurred_at,
            summary_text=i.summary_text,
        )
        for i in interactions_result.scalars().all()
    ]

    open_mismatches = await _open_mismatches(db, player.id)
    active_flags = [
        FlagBadge(kind="mismatch", label=m.mismatch_type, detail=m.description) for m in open_mismatches
    ]
    if player.minor_flag:
        active_flags.append(
            FlagBadge(kind="compliance", label="Minor player", detail="Player is flagged as a minor")
        )

    return ProfileSummaryResponse(
        player_id=player.id,
        name=player.name,
        segment_tags=segment_tags,
        top_quests=top_quests,
        top_interactions=top_interactions,
        active_flags=active_flags,
    )


@router.get("/{player_id}/summary", response_model=ProfileSummaryResponse)
async def get_profile_summary(
    player_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
) -> ProfileSummaryResponse:
    if settings.use_mock_profiles:
        return _mock_get_profile_summary(player_id)

    player = await _get_player_or_404(db, player_id)
    return await _build_profile_summary(db, player)


@router.get("/{player_id}/summary/ai", response_model=ProfileAiSummaryResponse)
async def get_profile_ai_summary(
    player_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: AdminUser = Depends(get_current_admin),
) -> ProfileAiSummaryResponse:
    if settings.use_mock_profiles:
        player = mock_data.get_mock_player(player_id)
        if player is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
        return ProfileAiSummaryResponse(**mock_data.mock_ai_summary(player))

    player = await _get_player_or_404(db, player_id)
    fin_profile = await db.get(FinancialProfile, player_id)
    if fin_profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial profile not found")
    psych_profile = await db.get(PsychometricProfile, player_id)

    open_mismatches = await _open_mismatches(db, player_id)
    mismatch_state = [
        {"id": str(m.id), "mismatch_type": m.mismatch_type, "resolved": m.resolved}
        for m in open_mismatches
    ]
    current_hash = compute_source_hash(fin_profile.profile_json, mismatch_state)

    is_cached = (
        fin_profile.source_hash == current_hash
        and fin_profile.ai_summary_text is not None
        and fin_profile.last_generated_at is not None
    )

    if not is_cached:
        summary_text, based_on = generate_summary_text(
            player.name,
            fin_profile.profile_json,
            psych_profile.profile_json if psych_profile else {},
            [{"mismatch_type": m.mismatch_type} for m in open_mismatches],
        )
        fin_profile.ai_summary_text = summary_text
        fin_profile.ai_summary_based_on = based_on
        fin_profile.source_hash = current_hash
        fin_profile.last_generated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(fin_profile)

    return ProfileAiSummaryResponse(
        summary_text=fin_profile.ai_summary_text,
        based_on=fin_profile.ai_summary_based_on or [],
        generated_at=fin_profile.last_generated_at,
        is_cached=is_cached,
    )


@router.post("/{player_id}/override", response_model=OverrideResponse)
async def override_field(
    player_id: uuid.UUID,
    payload: OverrideRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(require_role("product_analyst", "tier1_admin", "tier2_admin")),
) -> OverrideResponse:
    if settings.use_mock_profiles:
        applied = mock_data.apply_mock_override(player_id, payload.field_path, payload.new_value)
        if not applied:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
        # Audit log is still written to the real database -- overrides are an admin-accountability
        # action regardless of where the underlying profile data lives. The mutation itself is
        # in-memory only (not persisted) since mock mode has no backing player row.
        entry = await write_audit_log(
            db,
            admin_id=admin.id,
            action_type="field_override",
            target_type="player",
            target_id=str(player_id),
            details={
                "field_path": payload.field_path,
                "new_value": payload.new_value,
                "reason": payload.reason,
                "data_source": "mock",
            },
        )
        await db.commit()
        return OverrideResponse(success=True, audit_log_id=entry.id)

    player = await _get_player_or_404(db, player_id)

    entry = await write_audit_log(
        db,
        admin_id=admin.id,
        action_type="field_override",
        target_type="player",
        target_id=str(player.id),
        details={
            "field_path": payload.field_path,
            "new_value": payload.new_value,
            "reason": payload.reason,
        },
    )

    # Apply the override to the relevant profile_json blob when the field_path targets one.
    if payload.field_path.startswith("financial_profile."):
        fin_profile = await db.get(FinancialProfile, player_id)
        if fin_profile is not None:
            key = payload.field_path.split(".", 1)[1]
            fin_profile.profile_json = {**fin_profile.profile_json, key: payload.new_value}
            fin_profile.updated_at = datetime.now(timezone.utc)
    elif payload.field_path.startswith("psychometric_profile."):
        psych_profile = await db.get(PsychometricProfile, player_id)
        if psych_profile is not None:
            key = payload.field_path.split(".", 1)[1]
            psych_profile.profile_json = {**psych_profile.profile_json, key: payload.new_value}
            psych_profile.updated_at = datetime.now(timezone.utc)

    await db.commit()

    return OverrideResponse(success=True, audit_log_id=entry.id)


@router.get("/{player_id}/export")
async def export_profile(
    player_id: uuid.UUID,
    format: str = Query("json", pattern="^(json|pdf)$"),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> Response:
    if format == "pdf":
        # PDF generation is out of scope for this pass (bonus per the build spec). Returning
        # 501 rather than faking a PDF payload the frontend can't actually render/download.
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="PDF export is not implemented yet; use format=json",
        )

    if settings.use_mock_profiles:
        player = mock_data.get_mock_player(player_id)
        if player is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
        snapshot = {
            "player": {
                "id": str(player["id"]),
                "external_game_id": player["external_game_id"],
                "name": player["name"],
                "signup_date": player["signup_date"].isoformat(),
                "last_active_at": player["last_active_at"].isoformat(),
                "current_game_level": player["current_game_level"],
                "minor_flag": player["minor_flag"],
                "consent_status": player["consent_status"],
            },
            "financial_profile": player["financial_profile"],
            "psychometric_profile": player["psychometric_profile"],
            "open_mismatches": [
                {
                    "id": str(m["id"]),
                    "mismatch_type": m["mismatch_type"],
                    "description": m["description"],
                    "detected_at": m["detected_at"].isoformat(),
                    "resolved": m["resolved"],
                }
                for m in player["mismatches"]
            ],
        }
        # Not written to audit_log in mock mode: the export isn't of a real player record, so
        # there's nothing compliance-relevant to log.
        return Response(content=json.dumps(snapshot, default=str), media_type="application/json")

    player = await _get_player_or_404(db, player_id)

    fin_profile = await db.get(FinancialProfile, player_id)
    psych_profile = await db.get(PsychometricProfile, player_id)
    open_mismatches = await _open_mismatches(db, player_id)

    snapshot = {
        "player": {
            "id": str(player.id),
            "external_game_id": player.external_game_id,
            "name": player.name,
            "signup_date": player.signup_date.isoformat(),
            "last_active_at": player.last_active_at.isoformat(),
            "current_game_level": player.current_game_level,
            "minor_flag": player.minor_flag,
            "consent_status": player.consent_status,
        },
        "financial_profile": fin_profile.profile_json if fin_profile else {},
        "psychometric_profile": psych_profile.profile_json if psych_profile else {},
        "open_mismatches": [
            {
                "id": str(m.id),
                "mismatch_type": m.mismatch_type,
                "description": m.description,
                "detected_at": m.detected_at.isoformat(),
                "resolved": m.resolved,
            }
            for m in open_mismatches
        ],
    }

    await write_audit_log(
        db,
        admin_id=admin.id,
        action_type="export",
        target_type="player",
        target_id=str(player.id),
        details={"format": format},
    )
    await db.commit()

    return Response(content=json.dumps(snapshot, default=str), media_type="application/json")
