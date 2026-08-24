from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Separate engine/sessionmaker from app.core.database's -- this one points at the GAME's own
# Postgres DB (read-only), not this app's own DB.
game_engine = create_async_engine(settings.game_database_url, echo=False, future=True)
GameSessionLocal = async_sessionmaker(game_engine, class_=AsyncSession, expire_on_commit=False)
