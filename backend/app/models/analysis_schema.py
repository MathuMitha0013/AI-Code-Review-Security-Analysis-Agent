"""
Data contracts for the Code Analysis Agent (Milestone 2).

WHY A NEW SCHEMA FILE INSTEAD OF EXTENDING SubmissionResponse?
    SubmissionResponse (Milestone 1) is the Submission Module's contract —
    "is this code syntactically valid?" AnalysisResponse is a DIFFERENT
    contract — "what quality/design issues exist in this code?" Keeping
    them separate means Milestone 1's contract never has to change to
    accommodate Milestone 2's needs — exactly the Open/Closed Principle
    this project has followed since the architecture doc.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field

Severity = Literal["low", "medium", "high", "critical"]

FindingCategory = Literal[
    "code_smell",
    "complexity",
    "design_issue",
    "best_practice",
]


class Finding(BaseModel):
    """A single issue detected by the Code Analysis Agent."""

    category: FindingCategory
    rule: str = Field(..., description="Machine-readable rule identifier, e.g. 'LONG_METHOD'")
    message: str = Field(..., description="Human-readable explanation of the finding")
    severity: Severity
    function_name: Optional[str] = Field(default=None, description="Function/method where this was found, if applicable")
    line: Optional[int] = Field(default=None, description="Line number where this was found, if known")
    metric_value: Optional[float] = Field(
        default=None, description="The raw measured value that triggered this finding (e.g. cyclomatic complexity score)"
    )


class AnalysisSummary(BaseModel):
    """Aggregate counts, used by the frontend to render a severity breakdown."""

    total_findings: int
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class AnalysisResponse(BaseModel):
    """
    Full response from the Code Analysis Agent.

    Note this REUSES the same language detection concept from
    SubmissionResponse, but is returned by a different endpoint
    (/api/analyze) — the two response models stay independent even
    though they share some field names, so each can evolve separately.
    """

    language: Literal["python", "java", "unknown"]
    is_valid: bool
    syntax_error: Optional[str] = None
    findings: list[Finding] = Field(default_factory=list)
    summary: AnalysisSummary
