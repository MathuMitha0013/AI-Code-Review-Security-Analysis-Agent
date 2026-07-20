"""
Code Analysis Agent — orchestrator.

This is the single entry point the API layer calls. It dispatches to the
correct language-specific analyzer and builds the final summary — mirroring
the dispatch-table pattern already used in Milestone 1's syntax_validator.py.
"""

import logging

from app.agents.code_analysis.java_analyzer import analyze_java
from app.agents.code_analysis.python_analyzer import analyze_python
from app.models.analysis_schema import AnalysisSummary, Finding

logger = logging.getLogger(__name__)

_ANALYZERS = {
    "python": analyze_python,
    "java": analyze_java,
}


def run_code_analysis(code: str, language: str) -> list[Finding]:
    """
    Runs the appropriate language analyzer.

    Returns an empty list for unsupported/unknown languages rather than
    raising — the caller (API layer) decides how to represent "nothing to
    analyze" in the response.
    """
    analyzer = _ANALYZERS.get(language)
    if analyzer is None:
        logger.warning("No analyzer available for language: %s", language)
        return []
    return analyzer(code)


def summarize_findings(findings: list[Finding]) -> AnalysisSummary:
    """Builds the severity-breakdown summary used by the frontend."""
    summary = AnalysisSummary(total_findings=len(findings))
    for finding in findings:
        if finding.severity == "critical":
            summary.critical += 1
        elif finding.severity == "high":
            summary.high += 1
        elif finding.severity == "medium":
            summary.medium += 1
        elif finding.severity == "low":
            summary.low += 1
    return summary
