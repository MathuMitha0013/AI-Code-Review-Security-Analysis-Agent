"""
Application configuration.

Centralizes all environment-driven settings in one typed object instead of
scattering `os.environ.get(...)` calls throughout the codebase.

Why this matters for Secoria's growth:
    Milestone 2+ will add new config values (e.g., LLM API keys, ChromaDB
    path, agent timeouts). They all get added HERE, in one place, without
    touching any route or service logic.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Typed application settings, loaded from environment variables or a
    `.env` file at project startup.

    Pydantic validates these at import time — if `PORT` were set to a
    non-integer string in `.env`, the app would fail fast at startup with
    a clear error, instead of failing later inside a request handler.
    """

    # --- App metadata ---
    APP_NAME: str = "Secoria API"
    APP_VERSION: str = "0.1.0"  # Milestone 1

    # --- CORS ---
    # The frontend (Vite dev server) runs on a different origin/port than
    # the backend, so the browser blocks requests unless the backend
    # explicitly allows it. This list defines who is allowed to call us.
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",  # Vite default dev port
        "http://127.0.0.1:5173",
    ]

    # --- Logging ---
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# A single shared instance, imported wherever config is needed.
# This is the "Singleton" pattern applied via module-level instantiation —
# Python only runs this line once per process, so every import gets the
# same object.
settings = Settings()
