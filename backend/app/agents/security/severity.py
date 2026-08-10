"""
Severity policy for the Security Vulnerability Agent.

WHY THIS LOOKS DIFFERENT FROM THE CODE ANALYSIS AGENT'S severity.py:
    The Code Analysis Agent's severity SCALES with a measured value (a
    22-line function is lower severity than an 80-line one). Security
    vulnerabilities don't work that way — using eval() on user input is
    CRITICAL regardless of "how much" eval() is used; there's no
    meaningful magnitude to threshold against. So here, severity is a
    fixed property of the RULE itself, defined once per vulnerability
    type, based on real-world exploitability and impact (informed by
    OWASP's own risk ratings).
"""

from app.models.security_schema import Severity, VulnerabilityFinding

# Fixed severity per rule -- centralizing this means adjusting how
# seriously we treat a given vulnerability type is a one-line change
# here, not a hunt through both language analyzers.
RULE_SEVERITY = {
    "CODE_EXECUTION_EVAL_EXEC": Severity.CRITICAL,
    "OS_COMMAND_INJECTION": Severity.CRITICAL,
    "SHELL_INJECTION_SUBPROCESS": Severity.HIGH,
    "SQL_INJECTION_CONCAT": Severity.HIGH,
    "INSECURE_DESERIALIZATION": Severity.HIGH,
    "HARDCODED_CREDENTIALS": Severity.HIGH,
    "WEAK_HASH_ALGORITHM": Severity.MEDIUM,
    "DISABLED_TLS_VERIFICATION": Severity.MEDIUM,
    "INSECURE_RANDOMNESS": Severity.MEDIUM,
    "COMMAND_INJECTION_RUNTIME_EXEC": Severity.CRITICAL,
}

_SEVERITY_RANK = {Severity.LOW: 0, Severity.MEDIUM: 1, Severity.HIGH: 2, Severity.CRITICAL: 3}


def compute_overall_severity(findings: list[VulnerabilityFinding]) -> Severity:
    """Overall severity = the single highest severity among all findings."""
    if not findings:
        return Severity.LOW
    return max(findings, key=lambda f: _SEVERITY_RANK[f.severity]).severity
