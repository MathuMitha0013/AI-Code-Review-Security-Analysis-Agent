"""
Code Analysis API routes.

WATCH THIS CLOSELY — it's the payoff of the entire Milestone 1 architecture
decision: this route calls `detect_language` and `validate_syntax` from
`app/services/` — THE EXACT SAME FUNCTIONS the Submission Module used —
with ZERO modifications to either of those files. This is the Open/Closed
Principle stated in Milestone 1's architecture doc, now proven in code,
not just in theory.
"""

import logging

from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.agents.code_analysis.analyzer import run_code_analysis, summarize_findings
from app.models.analysis_schema import AnalysisResponse
from app.services.language_detector import detect_language
from app.services.syntax_validator import validate_syntax

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])

_MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_code(
    code: str | None = Form(default=None),
    file: UploadFile | None = None,
) -> AnalysisResponse:
    """
    Runs the full Code Analysis Agent pipeline: language detection ->
    syntax validation -> (if valid) code smell / complexity / design /
    best-practice analysis -> severity-scored findings.

    If syntax is invalid, analysis is skipped — there is no meaningful way
    to compute complexity or detect design issues in code that doesn't
    even parse. This mirrors real-world code review tools, which also
    require a compilable/parseable baseline before deeper analysis runs.
    """
    if code is None and file is None:
        raise HTTPException(status_code=400, detail="Provide either 'code' or 'file', not neither.")
    if code is not None and file is not None:
        raise HTTPException(status_code=400, detail="Provide only one of 'code' or 'file', not both.")

    filename: str | None = None
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
    is_valid, syntax_error = validate_syntax(code=code, language=language)

    if not is_valid:
        logger.info("Skipping analysis: syntax invalid (%s)", syntax_error)
        return AnalysisResponse(
            language=language,
            is_valid=False,
            syntax_error=syntax_error,
            findings=[],
            summary=summarize_findings([]),
        )

    findings = run_code_analysis(code=code, language=language)
    summary = summarize_findings(findings)

    logger.info("Analysis complete: %d findings for %s code", len(findings), language)

    return AnalysisResponse(
        language=language,
        is_valid=True,
        syntax_error=None,
        findings=findings,
        summary=summary,
    )
