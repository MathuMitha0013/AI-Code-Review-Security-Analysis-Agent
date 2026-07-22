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
from app.api.orchestration import router as orchestration_router
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

    Currently only logs startup, but this is WHERE Milestone 4 will load
    the sentence-transformers embedding model into memory once (expensive
    operation) rather than reloading it on every chat request — a concrete
    example of how Milestone 1's structure absorbs future needs without
    a rewrite.
    """
    logger.info("%s v%s starting up.", settings.APP_NAME, settings.APP_VERSION)
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


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """
    Basic liveness endpoint. Useful for:
    - Confirming the server is up during local development
    - Future deployment health checks (Docker, Kubernetes, CI/CD)
    """
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}
