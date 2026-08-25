from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Local dev default: SQLite, zero external services required. Swap to a Postgres DSN
    # (postgresql+asyncpg://user:pass@host:5432/dbname) for anything beyond local dev --
    # that's still the intended production target per the original spec; the models use
    # portable types (see app/models/types.py) so the swap needs no code changes.
    database_url: str = "sqlite+aiosqlite:///./finguru.db"
    jwt_secret: str = "change-me-in-prod-please"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    # Host/port the API server binds to (used by `python -m app.main`, see bottom of that file).
    backend_host: str = "127.0.0.1"
    backend_port: int = 8000

    # Must match the frontend's own FRONTEND_PORT (frontend/.env) so CORS allows it.
    cors_origins: str = "http://localhost:5173"

    # "db" (default) reads player/financial/psychometric data from the database as normal.
    # "mock" serves generated in-memory "digital twin" data from app/services/mock_data.py
    # instead, for previewing the Player Profiles screens without a seeded database. Scoped to
    # /api/profiles only -- auth and /api/handoffs always use the database.
    data_source: str = "db"

    # Live sync from the game's own Postgres DB (see app/services/game_sync.py and
    # app/game_db/): on startup, a background loop queries GAME_DATABASE_URL directly (via
    # app/game_db/profile_builder.py, a hand-maintained async port of the game backend's own
    # app/profile_builder.py) every PROFILE_SYNC_INTERVAL_SECONDS and upserts the computed
    # profiles into this app's own DB, so Player Profiles reflects real gameplay without a
    # manual import_profiles.py run. Disabled automatically when DATA_SOURCE=mock (nothing to
    # sync into). Must use the asyncpg driver (not psycopg2, which the game backend's own
    # DATABASE_URL uses) since this app's DB layer is async throughout.
    game_database_url: str = "postgresql+asyncpg://moneyverse:moneyverse@localhost:5432/moneyverse"
    profile_sync_interval_seconds: int = 25
    enable_game_sync: bool = True

    # "db" (default) does the live SQL sync described above via GAME_DATABASE_URL. "json_file"
    # instead polls a JSON file that the game backend writes to disk after every
    # profile-relevant change (see backend/app/main.py's _write_profiles_export_to_disk) --
    # same shape as that backend's GET /api/admin/export-profiles. Use this when this app can't
    # open a direct DB connection to the game's database (e.g. a locked-down sandbox network),
    # but both backends' processes share a filesystem.
    game_sync_source: str = "db"
    # Only read when game_sync_source="json_file". Relative paths resolve against this file's
    # own directory (admin_dashboard/backend/), so the default ("../../shared_data/...") points
    # at <repo root>/shared_data/exported_profiles.json -- the same path the game backend writes
    # to by default.
    game_export_json_path: str = "../../shared_data/exported_profiles.json"
    # Just a local file stat each cycle (no network round trip), so this can be much shorter
    # than profile_sync_interval_seconds without meaningfully costing anything.
    game_sync_json_poll_seconds: int = 5

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def use_mock_profiles(self) -> bool:
        return self.data_source.strip().lower() == "mock"

    @property
    def use_json_game_sync(self) -> bool:
        return self.game_sync_source.strip().lower() == "json_file"


settings = Settings()
