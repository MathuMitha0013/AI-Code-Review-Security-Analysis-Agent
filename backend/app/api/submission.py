"""
Submission API routes.

This file ONLY handles HTTP concerns: reading the request, calling services,
shaping the response, and returning correct status codes. It contains NO
business logic — that lives in `app/services/`. This separation means these
routes stay short and readable even as Milestone 2+ agents get triggered
from similar endpoints.
"""

import logging

from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.models.submission_schema import SubmissionResponse
from app.services.language_detector import detect_language
from app.services.syntax_validator import validate_syntax

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["submission"])

# Reasonable upper bound to prevent someone from uploading a 500MB file
# and tying up server resources. 1 MB is generous for a single source file.
_MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024


@router.post("/submit", response_model=SubmissionResponse)
async def submit_code(
    code: str | None = Form(default=None),
    file: UploadFile | None = None,
) -> SubmissionResponse:
    """
    Accepts EITHER pasted code (`code` form field) OR an uploaded file
    (`file` field) — not both. Detects the language and validates syntax.

    Why one endpoint for both paste and upload, instead of two separate
    endpoints?
        Both paths converge on identical logic afterward (detect -> validate).
        Two endpoints would duplicate that orchestration. One endpoint with
        two optional inputs keeps the API surface small and the logic DRY.
    """
    if code is None and file is None:
        raise HTTPException(
            status_code=400,
            detail="Provide either 'code' (pasted text) or 'file' (upload), not neither.",
        )
    if code is not None and file is not None:
        raise HTTPException(
            status_code=400,
            detail="Provide only one of 'code' or 'file', not both.",
        )

    filename: str | None = None

    if file is not None:
        filename = file.filename
        raw_bytes = await file.read()

        if len(raw_bytes) > _MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File exceeds 1MB limit.")

        try:
            code = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="File could not be decoded as UTF-8 text. Is this a valid source file?",
            )

    logger.info("Received submission (filename=%s, code_length=%d)", filename, len(code or ""))

    language = detect_language(code=code, filename=filename)
    is_valid, error = validate_syntax(code=code, language=language)

    return SubmissionResponse(
        language=language,
        is_valid=is_valid,
        error=error,
        filename=filename,
    )
