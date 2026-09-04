"""
Data contracts for the Orchestrator's unified review output.

WHY A THIRD SCHEMA FILE, SEPARATE FROM analysis_schema.py AND
security_schema.py?
    This is the "Unified Security Report" / merged findings list from the
    mentor's pipeline diagram -- a DIFFERENT shape than either individual
    agent's output. It flattens both agents' findings into one common
    structure (tagged by source_agent) rather than nesting two separate
    report objects, because a developer reading a code review shouldn't
    have to know or care which agent found which issue to see everything
    sorted by what matters most: severity.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field

Severity = Literal["low", "medium", "high", "critical"]
SourceAgent = Literal["code_analysis", "security"]


class UnifiedFinding(BaseModel):
    """One finding from either agent, normalized into a common shape."""

    source_agent: SourceAgent = Field(..., description="Which agent produced this finding")
    category: str = Field(..., description="Code smell category, or OWASP category for security findings")
    title: str
    description: str
    severity: Severity
    line: Optional[int] = None
    code_snippet: Optional[str] = Field(default=None, description="Only populated for security findings currently")


class UnifiedSummary(BaseModel):
    total_findings: int
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    code_analysis_findings: int = Field(..., description="Count from the Code Analysis Agent before merging")
    security_findings: int = Field(..., description="Count from the Security Vulnerability Agent before merging")
    duplicates_removed: int = 0


class UnifiedReviewReport(BaseModel):
    """
    The Orchestrator's complete output — one merged, prioritized,
    deduplicated findings list covering both agents.

    NOTE: unlike an earlier draft of this schema, there is no separate
    `complexity` field here -- the Code Analysis Agent's actual schema
    (app/models/analysis_schema.py) represents complexity as individual
    Finding entries (category="complexity", metric_value=<score>), not as
    a separate aggregate object. This schema reflects that real contract.
    """

    language: str
    findings: list[UnifiedFinding]
    summary: UnifiedSummary
    overall_severity: Severity
    health_score: int = Field(
        default=100,
        ge=0,
        le=100,
        description="Overall code health score from 0 to 100 calculated by findings severity",
    )


class FileReviewItem(BaseModel):
    """Review outcome for an individual Python or Java file in the archive."""

    file_path: str
    language: str  # "python" or "java"
    lines_of_code: int = 0
    health_score: int = 100
    overall_severity: Severity = "low"
    findings: list[UnifiedFinding] = []
    summary: UnifiedSummary
    syntax_error: Optional[str] = None


class MultiFileSummary(BaseModel):
    """Aggregated project-wide repository metrics across all scanned Python and Java files."""

    total_files_scanned: int
    total_lines_of_code: int
    python_files_count: int = 0
    java_files_count: int = 0
    total_findings: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    clean_files_count: int = 0
    vulnerable_files_count: int = 0


class MultiFileReviewReport(BaseModel):
    """Complete aggregated review report for a multi-file Java/Python ZIP project."""

    archive_name: str
    summary: MultiFileSummary
    overall_health_score: int = Field(
        default=100,
        ge=0,
        le=100,
        description="Aggregated project health score from 0 to 100",
    )
    overall_severity: Severity
    files: list[FileReviewItem]
    skipped_files: list[str] = Field(
        default_factory=list,
        description="Files in archive that were skipped (non-python/java, binaries, or ignored dirs)",
    )
