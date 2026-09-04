"""
Remediation Agent API route.

Unlike every prior agent's route, this one does NOT take raw code + trigger
detection — it takes an ALREADY-DETECTED finding (from a prior /api/review
call) and generates a fix for it. This matches the on-demand,
per-finding design documented in agent.py.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.agents.remediation.agent import generate_remediation, generate_full_remediation
from app.models.remediation_schema import RemediationRequest, RemediationResponse
from app.models.remediate_all_schema import RemediateAllRequest, RemediateAllResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["remediation"])


@router.post("/remediate", response_model=RemediationResponse)
async def remediate_finding(request: RemediationRequest) -> RemediationResponse:
    """Generates a fix suggestion for a single finding, on demand."""
    try:
        result = generate_remediation(request)
    except RuntimeError as exc:
        if "not configured" in str(exc) or "missing API keys" in str(exc):
            raise HTTPException(status_code=503, detail=str(exc))
        raise HTTPException(status_code=502, detail=str(exc))

    return RemediationResponse(finding_title=request.finding_title, remediation=result)


@router.post("/remediate-all", response_model=RemediateAllResponse)
async def auto_remediate_all(request: RemediateAllRequest) -> RemediateAllResponse:
    """
    Synthesizes all findings and produces a fully patched, clean,
    and secure version of the entire codebase with an audit changelog.
    """
    try:
        result = generate_full_remediation(request)
        return result
    except RuntimeError as exc:
        if "not configured" in str(exc) or "missing API keys" in str(exc):
            raise HTTPException(status_code=503, detail=str(exc))
        raise HTTPException(status_code=502, detail=str(exc))

