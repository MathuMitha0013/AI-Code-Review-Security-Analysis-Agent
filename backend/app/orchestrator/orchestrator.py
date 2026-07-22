"""
Orchestrator — the central hub described in the mentor's pipeline diagram.

Receives submitted code, dispatches it to the Code Analysis Agent and
Security Vulnerability Agent CONCURRENTLY, then merges their outputs into
one prioritized, deduplicated report.

WHY DOES THIS LIVE OUTSIDE app/agents/ AS ITS OWN TOP-LEVEL MODULE?
    The Orchestrator is not itself an agent -- it doesn't analyze code.
    It coordinates OTHER agents. Placing it alongside app/agents/ (as a
    sibling, not a child) reflects that architectural distinction:
    app/agents/ holds things that analyze code; app/orchestrator/ holds
    the thing that calls them and combines results.
"""

import asyncio
import logging

from app.agents.code_analysis.analyzer import run_code_analysis
from app.agents.security.agent import run_security_scan
from app.models.submission_schema import SupportedLanguage
from app.orchestrator.schemas import UnifiedFinding, UnifiedReviewReport, UnifiedSummary

logger = logging.getLogger(__name__)

_SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}


async def run_orchestrated_review(code: str, language: SupportedLanguage) -> UnifiedReviewReport:
    """
    Runs both agents CONCURRENTLY via a thread pool executor, then merges
    their outputs.

    WHY asyncio.gather + run_in_executor INSTEAD OF CALLING BOTH AGENTS
    ONE AFTER ANOTHER?
        Both agents are pure CPU-bound, synchronous functions (AST parsing
        has no I/O to await). Calling them back-to-back would block for
        the SUM of both durations, sequentially. Submitting them to a
        thread pool and awaiting both with `asyncio.gather` runs them
        concurrently AND keeps the event loop free to serve other
        requests while these CPU-bound tasks execute in worker threads.
        Total wall-clock time for this request becomes bounded by the
        SLOWER of the two agents, not their sum -- matching the mentor's
        "Parallel Execution" requirement exactly.

    NOTE: `run_code_analysis` returns a plain `list[Finding]` (see
    app/agents/code_analysis/analyzer.py), while `run_security_scan`
    returns a full `SecurityScanReport` object with `.findings` nested
    inside (see app/agents/security/agent.py). These two agents were
    built independently and their return shapes genuinely differ --
    the merge logic below normalizes both into the same UnifiedFinding
    shape regardless of that difference.
    """
    loop = asyncio.get_running_loop()

    code_analysis_task = loop.run_in_executor(None, run_code_analysis, code, language)
    security_task = loop.run_in_executor(None, run_security_scan, code, language)

    logger.info("Orchestrator dispatching Code Analysis and Security agents concurrently")
    code_findings, security_report = await asyncio.gather(code_analysis_task, security_task)

    merged_findings, duplicates_removed = _merge_findings(code_findings, security_report.findings)
    merged_findings = _prioritize(merged_findings)

    summary = UnifiedSummary(
        total_findings=len(merged_findings),
        critical=sum(1 for f in merged_findings if f.severity == "critical"),
        high=sum(1 for f in merged_findings if f.severity == "high"),
        medium=sum(1 for f in merged_findings if f.severity == "medium"),
        low=sum(1 for f in merged_findings if f.severity == "low"),
        code_analysis_findings=len(code_findings),
        security_findings=len(security_report.findings),
        duplicates_removed=duplicates_removed,
    )

    return UnifiedReviewReport(
        language=language,
        findings=merged_findings,
        summary=summary,
        overall_severity=_compute_overall_severity(merged_findings),
    )


def _merge_findings(code_findings, security_findings) -> tuple[list[UnifiedFinding], int]:
    """
    Merges both agents' findings into one list, tagging each with its
    source agent, and removes duplicates.

    DUPLICATE DEFINITION (documented scope decision): two findings are
    considered duplicates if they share the same (title, line) pair.
    Given the two agents currently cover entirely distinct concerns
    (design/quality vs. OWASP vulnerabilities), true duplicates are rare
    today -- this check exists so behavior is correct and testable NOW,
    before future agents (Remediation, PR Summary) potentially introduce
    more rule overlap.

    CONFLICT RESOLUTION (documented scope decision): no conflicting-
    severity case exists yet, since each finding's severity is decided
    independently within its own agent. If a future scenario had two
    agents flag the SAME (title, line) with DIFFERENT severities, this is
    the function that would need a resolution policy (e.g., "trust the
    higher severity"). Flagged here as a known extension point, not
    silently ignored.

    NORMALIZING TWO DIFFERENT SCHEMAS: Code Analysis findings use
    `rule`/`message` field names and plain-string `category`/`severity`
    (see analysis_schema.py). Security findings use `title`/`description`
    field names and an actual `Severity` Enum (see security_schema.py) --
    hence `.value` is needed for security's severity but NOT for code
    analysis's, since they were built as genuinely different types.
    """
    seen: set[tuple[str, int | None]] = set()
    merged: list[UnifiedFinding] = []
    duplicates_removed = 0

    for finding in code_findings:
        key = (finding.rule, finding.line)
        if key in seen:
            duplicates_removed += 1
            continue
        seen.add(key)
        merged.append(UnifiedFinding(
            source_agent="code_analysis",
            category=finding.category,
            title=finding.rule.replace("_", " ").title(),
            description=finding.message,
            severity=finding.severity,
            line=finding.line,
            code_snippet=None,
        ))

    for finding in security_findings:
        key = (finding.title, finding.line)
        if key in seen:
            duplicates_removed += 1
            continue
        seen.add(key)
        merged.append(UnifiedFinding(
            source_agent="security",
            category=finding.owasp_category,
            title=finding.title,
            description=finding.description,
            severity=finding.severity.value,
            line=finding.line,
            code_snippet=finding.code_snippet,
        ))

    return merged, duplicates_removed


def _prioritize(findings: list[UnifiedFinding]) -> list[UnifiedFinding]:
    """
    Sorts findings by severity, most critical first -- the "prioritize
    the most critical issues" requirement from the mentor's spec, made
    concrete as a stable sort (ties keep their original relative order).
    """
    return sorted(findings, key=lambda f: _SEVERITY_RANK[f.severity], reverse=True)


def _compute_overall_severity(findings: list[UnifiedFinding]) -> str:
    if not findings:
        return "low"
    return max(findings, key=lambda f: _SEVERITY_RANK[f.severity]).severity
