from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Core
    APP_NAME: str = "NextRound API"
    ENV: str = "development"

    # Database — SQLite, a single local file. No server to install or run.
    DATABASE_URL: str = "sqlite+aiosqlite:///./nextround.db"

    # Auth
    JWT_SECRET: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days, covers guest + user sessions

    # Gemini (Google AI Studio) — free tier, no billing required
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-flash-lite-latest"  # auto-tracks Google's current free-tier Flash-Lite model

    # Local code execution (no external API) — timeout per test case, in seconds
    CODE_EXEC_TIMEOUT_SECONDS: int = 8

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
