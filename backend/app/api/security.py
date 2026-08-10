"""
Security Vulnerability Agent API route.

Structured identically to app/api/analysis.py -- same input handling
(paste or file, one or the other), same reuse of Milestone 1's language
detection and syntax validation. This consistency is deliberate: any
future agent (Remediation, PR Summary) will follow this exact pattern.
"""

import logging

from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.agents.security.agent import run_security_scan
from app.models.security_schema import SecurityScanReport
from app.services.language_detector import detect_language
from app.services.syntax_validator import validate_syntax

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["security"])

_MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024


@router.post("/security-scan", response_model=SecurityScanReport)
async def scan_security(
    code: str | None = Form(default=None),
    file: UploadFile | None = None,
) -> SecurityScanReport:
    """Runs the Security Vulnerability Agent on submitted code."""
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
        raise HTTPException(
            status_code=422,
            detail=f"Cannot scan code with syntax errors: {error}",
        )

    try:
        report = run_security_scan(code=code, language=language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return report
