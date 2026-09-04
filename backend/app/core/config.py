"""
Application configuration.

Centralizes all environment-driven settings in one typed object instead of
scattering `os.environ.get(...)` calls throughout the codebase.

Why this matters for Secoria's growth:
    Milestone 2+ will add new config values (e.g., LLM API keys, ChromaDB
    path, agent timeouts). They all get added HERE, in one place, without
    touching any route or service logic.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_CHROMA_PATH = str(
    (Path(__file__).resolve().parents[2] / "knowledge-base" / "chroma_store")
    if (Path(__file__).resolve().parents[2] / "knowledge-base" / "chroma_store").exists()
    else Path("../knowledge-base/chroma_store")
)


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
    APP_VERSION: str = "1.0.0"

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

    # --- Multi-Provider LLM Settings (Gemini -> Groq -> Ollama Fallback) ---
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    GROQ_API_KEY: str = ""
    GROQ_API_KEY_2: str = ""
    GROQ_API_KEY_3: str = ""
    GROQ_API_KEYS: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    OLLAMA_MODEL: str = "qwen2.5-coder"
    LLM_PROVIDER_ORDER: str = "gemini,groq,ollama"

    # --- Vector DB (RAG Chatbot - Milestone 3) ---
    CHROMA_PERSIST_DIR: str = _DEFAULT_CHROMA_PATH
    CHROMA_COLLECTION_NAME: str = "secure_coding_knowledge_base"

    # --- GitHub Bot & CI/CD Integration ---
    GITHUB_TOKEN: str = ""
    GITHUB_WEBHOOK_SECRET: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# A single shared instance, imported wherever config is needed.
# This is the "Singleton" pattern applied via module-level instantiation —
# Python only runs this line once per process, so every import gets the
# same object.
settings = Settings()
