import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, handoffs, profiles, ws
from app.services import game_sync, pubsub

logger = logging.getLogger("finguru_admin")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await pubsub.start_listener()
    except Exception as exc:  # pragma: no cover - local dev convenience
        logger.warning("Postgres LISTEN/NOTIFY listener could not start (%s); WS push disabled, "
                        "frontend polling fallback still works.", exc)

    sync_task = None
    if settings.enable_game_sync and not settings.use_mock_profiles:
        sync_task = asyncio.create_task(game_sync.sync_loop())
        logger.info(
            "game_sync: querying %s every %ds",
            settings.game_database_url, settings.profile_sync_interval_seconds,
        )

    yield

    if sync_task is not None:
        sync_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await sync_task
    try:
        await pubsub.stop_listener()
    except Exception:  # pragma: no cover
        pass


app = FastAPI(title="Admin Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(handoffs.router)
app.include_router(ws.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


if __name__ == "__main__":
    # Run via `python -m app.main` so BACKEND_HOST/BACKEND_PORT in .env are the single source of
    # truth for where the server binds -- no port hardcoded in run_backend*.bat.
    import uvicorn

    uvicorn.run("app.main:app", host=settings.backend_host, port=settings.backend_port, reload=True)
