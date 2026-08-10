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
from app.api.orchestration import router as orchestration_router
from app.api.pr_summary import router as pr_summary_router
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

    Pre-loads the sentence-transformers embedding model and ChromaDB client
    into memory once on startup rather than re-instantiating on every request.
    """
    logger.info("%s v%s starting up.", settings.APP_NAME, settings.APP_VERSION)
    
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
        from langchain_chroma import Chroma
        import chromadb
        from chromadb.config import Settings as ChromaSettings

        # 1. Pre-load Embeddings Model
        logger.info("Pre-loading sentence-transformers embedding model (all-MiniLM-L6-v2)...")
        _app.state.embedding_function = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        logger.info("HuggingFace embedding model pre-loaded successfully.")

        # 2. Pre-load ChromaDB Vector Store Client (Singleton connection)
        logger.info("Initializing ChromaDB connection at %s...", settings.CHROMA_PERSIST_DIR)
        chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        _app.state.vector_store = Chroma(
            client=chroma_client,
            collection_name=settings.CHROMA_COLLECTION_NAME,
            embedding_function=_app.state.embedding_function,
        )
        logger.info("ChromaDB vector store connection cached on state successfully.")
    except Exception as exc:
        logger.critical("Failed to pre-load embedding model or database: %s", exc)
        raise exc

    yield
    logger.info("%s shutting down.", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Secoria API — Milestone 1: Code Submission Module. "
        "Detects programming language and validates syntax for pasted or "
        "uploaded Python/Java code."
    ),
    lifespan=lifespan,
)

# CORS: without this, the browser blocks the React frontend (different
# origin/port) from calling this API — you'd see a CORS error in the
# browser console even though the request works fine in Postman/curl.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
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


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """
    Basic liveness endpoint. Useful for:
    - Confirming the server is up during local development
    - Future deployment health checks (Docker, Kubernetes, CI/CD)
    """
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}
