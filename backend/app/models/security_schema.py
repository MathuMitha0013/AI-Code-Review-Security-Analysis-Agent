"""
Data contracts for the Security Vulnerability Agent.

WHY A SEPARATE SCHEMA FROM analysis_schema.py (Code Analysis Agent)?
    These are conceptually different findings — a "God Object" and a
    "SQL Injection Vulnerability" are different domains entirely, scored
    against different standards (design principles vs. OWASP). Keeping
    schemas per-agent means each can evolve independently without one
    agent's changes accidentally breaking another's contract — the same
    reasoning applied to keep analysis_schema.py separate from
    submission_schema.py in Milestone 1.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class VulnerabilityFinding(BaseModel):
    """A single OWASP-category security issue detected in submitted code."""

    owasp_category: str = Field(..., description="e.g. 'A03:2021 - Injection'")
    rule_id: str = Field(..., description="Machine-readable rule identifier, e.g. 'SQL_INJECTION_CONCAT'")
    title: str = Field(..., description="Short human-readable name, e.g. 'SQL Injection via String Concatenation'")
    description: str = Field(..., description="Explanation of the vulnerability and why it's dangerous")
    severity: Severity
    line: Optional[int] = Field(default=None, description="Line number where the vulnerability occurs")
    code_snippet: Optional[str] = Field(default=None, description="The specific flagged line of source code")


class SecuritySummary(BaseModel):
    total_findings: int
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class SecurityScanReport(BaseModel):
    """
    The Security Vulnerability Agent's complete output for one code
    submission — the "Unified Security Report" in the mentor's pipeline
    diagram, before it's merged with the Code Analysis Agent's findings
    by future multi-agent orchestration.
    """

    language: str
    findings: list[VulnerabilityFinding]
    summary: SecuritySummary
    overall_severity: Severity
