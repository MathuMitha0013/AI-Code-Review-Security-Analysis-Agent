"""
Application entrypoint.

This file's ONLY job is to WIRE things together: create the FastAPI app,
attach middleware, register routers. It contains no business logic and no
route handlers of its own — those live in `app/api/`.

Run with:
    uvicorn app.main:app --reload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.analysis import router as analysis_router
from app.api.chat import router as chat_router
from app.api.github_webhook import router as github_router
from app.api.orchestration import router as orchestration_router
from app.api.pr_summary import router as pr_summary_router
from app.api.report import router as report_router
from app.api.remediation import router as remediation_router
from app.api.security import router as security_router
from app.api.submission import router as submission_router
from app.core.config import settings
from app.core.logging_config import configure_logging

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """
    Manages startup/shutdown logic for the app's lifetime.
    Starts up instantaneously so health checks and review routes are immediately available.
    """
    logger.info("%s v%s starting up.", settings.APP_NAME, settings.APP_VERSION)
    _app.state.vector_store = None

    import asyncio

    def _sync_init_rag():
        try:
            from langchain_huggingface import HuggingFaceEmbeddings
            from langchain_chroma import Chroma
            import chromadb
            from chromadb.config import Settings as ChromaSettings

            logger.info("Initializing ChromaDB connection in background thread...")
            embedding_function = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2",
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
            chroma_client = chromadb.PersistentClient(
                path=settings.CHROMA_PERSIST_DIR,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            _app.state.vector_store = Chroma(
                client=chroma_client,
                collection_name=settings.CHROMA_COLLECTION_NAME,
                embedding_function=embedding_function,
            )
            logger.info("ChromaDB vector store background initialization complete.")
        except Exception as exc:
            logger.warning("Background ChromaDB init notice: %s", exc)

    asyncio.create_task(asyncio.to_thread(_sync_init_rag))
    yield
    logger.info("%s shutting down.", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Secoria API — Multi-Agent AI Code Review & Security Analysis Platform. "
        "Automated code smell detection, OWASP Top 10 security scanning, "
        "AI-powered remediation with auto-patching, PR summary generation, "
        "and RAG-grounded conversational code assistance."
    ),
    lifespan=lifespan,
)

# CORS: without this, the browser blocks the React frontend (different
# origin/port) from calling this API — you'd see a CORS error in the
# browser console even though the request works fine in Postman/curl.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(submission_router)
app.include_router(analysis_router)
app.include_router(security_router)
app.include_router(orchestration_router)
app.include_router(remediation_router)
app.include_router(chat_router)
app.include_router(pr_summary_router)
app.include_router(report_router)
app.include_router(github_router)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """
    Basic liveness endpoint. Useful for:
    - Confirming the server is up during local development
    - Future deployment health checks (Docker, Kubernetes, CI/CD)
    """
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}
