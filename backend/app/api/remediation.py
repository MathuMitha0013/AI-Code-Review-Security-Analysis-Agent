"""
Remediation Agent API route.

Unlike every prior agent's route, this one does NOT take raw code + trigger
detection — it takes an ALREADY-DETECTED finding (from a prior /api/review
call) and generates a fix for it. This matches the on-demand,
per-finding design documented in agent.py.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.agents.remediation.agent import generate_remediation
from app.models.remediation_schema import RemediationRequest, RemediationResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["remediation"])


@router.post("/remediate", response_model=RemediationResponse)
async def remediate_finding(request: RemediationRequest) -> RemediationResponse:
    """Generates a fix suggestion for a single finding, on demand."""
    try:
        result = generate_remediation(request)
    except RuntimeError as exc:
        # Distinguish configuration errors (missing API key) from runtime
        # failures (API call itself failed) with different status codes,
        # so the frontend can show an appropriate message either way.
        if "not configured" in str(exc):
            raise HTTPException(status_code=503, detail=str(exc))
        raise HTTPException(status_code=502, detail=str(exc))

    return RemediationResponse(finding_title=request.finding_title, remediation=result)
