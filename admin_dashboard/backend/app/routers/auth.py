from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.core.security import create_access_token, verify_password
from app.models.models import AdminUser
from app.schemas.auth import LoginRequest, LoginResponse, MeResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    result = await db.execute(select(AdminUser).where(AdminUser.email == payload.email))
    admin = result.scalar_one_or_none()
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(str(admin.id), admin.role)
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        role=admin.role,
        admin_id=admin.id,
        name=admin.name,
    )


@router.get("/me", response_model=MeResponse)
async def me(admin: AdminUser = Depends(get_current_admin)) -> MeResponse:
    return MeResponse(id=admin.id, name=admin.name, email=admin.email, role=admin.role)
