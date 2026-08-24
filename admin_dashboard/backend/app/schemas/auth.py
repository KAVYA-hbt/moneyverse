import uuid

from pydantic import BaseModel

from app.schemas.common import Role


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    admin_id: uuid.UUID
    name: str


class MeResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: Role
