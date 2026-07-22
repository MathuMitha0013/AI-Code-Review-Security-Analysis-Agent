"""
Orchestrated Review API route.

This is the single endpoint matching the mentor's pipeline diagram end
to end: Upload -> Dispatch -> (parallel) Analyze/Execute -> Unified Report.
Structured identically to app/api/analysis.py and app/api/security.py --
same input handling, same reuse of Milestone 1's language detection and
syntax validation -- so the same "gate before analyzing" behavior applies
here too: code with syntax errors never reaches either agent.
"""

import logging

from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.orchestrator.orchestrator import run_orchestrated_review
from app.orchestrator.schemas import UnifiedReviewReport
from app.services.language_detector import detect_language
from app.services.syntax_validator import validate_syntax

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["orchestration"])

_MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024


@router.post("/review", response_model=UnifiedReviewReport)
async def review_code(
    code: str | None = Form(default=None),
    file: UploadFile | None = None,
) -> UnifiedReviewReport:
    """Runs the full orchestrated review: Code Analysis + Security, merged."""
    if code is None and file is None:
        raise HTTPException(status_code=400, detail="Provide either 'code' or 'file'.")
    if code is not None and file is not None:
        raise HTTPException(status_code=400, detail="Provide only one of 'code' or 'file'.")

    filename = None
    if file is not None:
        filename = file.filename
        raw_bytes = await file.read()
        if len(raw_bytes) > _MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File exceeds 1MB limit.")
        try:
            code = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="File could not be decoded as UTF-8 text.")

    language = detect_language(code=code, filename=filename)

    is_valid, error = validate_syntax(code=code, language=language)
    if not is_valid:
        raise HTTPException(status_code=422, detail=f"Cannot review code with syntax errors: {error}")

    try:
        report = await run_orchestrated_review(code=code, language=language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return report
