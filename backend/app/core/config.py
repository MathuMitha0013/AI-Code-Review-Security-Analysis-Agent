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

    # --- Remediation Agent (Milestone 3) ---
    # Loaded from backend/.env, which is gitignored -- never commit a real
    # key. Empty string default lets the app start without it configured;
    # the Remediation Agent itself raises a clear error only when actually
    # invoked without a key, rather than blocking the whole app at startup.
    #
    # WHY GROQ, NOT GOOGLE GEMINI (the original choice)?
    # Gemini keys generated via Google Cloud Console (as opposed to
    # standalone via aistudio.google.com) can end up with a provisioned
    # quota of literally 0 requests until billing is linked to that
    # specific Cloud project -- confirmed via direct API testing during
    # development (see Decision Log). Groq's free tier requires no
    # billing/card linkage at all, and its API is OpenAI-compatible, so
    # we use the mature, stable `openai` Python package pointed at
    # Groq's servers rather than a Google-specific SDK.
    # Multi-API Key pool support:
    # Set either GROQ_API_KEYS="key1,key2,key3" OR GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3
    GROQ_API_KEY: str = ""
    GROQ_API_KEY_2: str = ""
    GROQ_API_KEY_3: str = ""
    GROQ_API_KEYS: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-20b"

    # --- Vector DB (RAG Chatbot - Milestone 3) ---
    CHROMA_PERSIST_DIR: str = "../knowledge-base/chroma_store"
    CHROMA_COLLECTION_NAME: str = "secure_coding_knowledge_base"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# A single shared instance, imported wherever config is needed.
# This is the "Singleton" pattern applied via module-level instantiation —
# Python only runs this line once per process, so every import gets the
# same object.
settings = Settings()
