"""
Security Vulnerability Agent — orchestrator.

Dispatches to the correct language-specific analyzer, mirroring
app/agents/code_analysis/agent.py's dispatch pattern exactly. Keeping
both agents structured identically means a developer who understands one
already understands the other.
"""

import logging

from app.agents.security.java_analyzer import analyze_java
from app.agents.security.python_analyzer import analyze_python
from app.models.security_schema import SecurityScanReport
from app.models.submission_schema import SupportedLanguage

logger = logging.getLogger(__name__)

_ANALYZERS = {
    "python": analyze_python,
    "java": analyze_java,
}


def run_security_scan(code: str, language: SupportedLanguage) -> SecurityScanReport:
    analyzer = _ANALYZERS.get(language)
    if analyzer is None:
        raise ValueError(f"No Security Vulnerability Agent available for language: {language}")
    logger.info("Running Security Vulnerability Agent for language=%s", language)
    return analyzer(code)
