from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "SBI QuestCraft API"
    DATABASE_URL: str = "postgresql+psycopg2://questcraft:questcraft@localhost:5432/questcraft"
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    MESHY_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    LLM_MODEL: str = "claude-sonnet-4-6"


@lru_cache
def get_settings() -> Settings:
    return Settings()