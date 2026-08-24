"""Portable column types shared by all models.

DATABASE_URL is configurable (see app/core/config.py) -- local dev defaults to SQLite so the
whole stack runs with zero external services, but PostgreSQL is the intended production target
(the docker-compose.yml is kept for that). Postgres-only types (native UUID, JSONB, ENUM) don't
exist on SQLite, so we use portable equivalents here that compile to the right thing on both
backends via SQLAlchemy's dialect-aware TypeDecorator/JSON/Enum.
"""

import uuid

from sqlalchemy import CHAR, JSON, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.types import TypeEngine


class GUID(TypeDecorator):
    """Platform-independent UUID type.

    Uses Postgres's native UUID type when the dialect is postgresql, otherwise stores as a
    CHAR(36) string (SQLite and friends).
    """

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect) -> TypeEngine:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return str(value)
        if not isinstance(value, uuid.UUID):
            value = uuid.UUID(str(value))
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


# Generic JSON column -- compiles to JSON on SQLite, JSON on Postgres (JSONB would be a free
# upgrade there, but the contract here favors one column type that works everywhere).
JSONType = JSON
