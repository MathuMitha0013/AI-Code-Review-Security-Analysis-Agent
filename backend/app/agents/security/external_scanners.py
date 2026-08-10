"""
External Security Scanner Integrations — Bandit (Python) and Semgrep
(Python + Java).

WHY THIS FILE EXISTS (mentor-review context):
    Our own hand-written AST rules in python_analyzer.py/java_analyzer.py
    only detect the small, specific list of patterns we explicitly coded
    for. If a vulnerability pattern isn't on that list, it is invisible
    to us -- a real, structural limitation of any hand-rolled rule set.
    Bandit and Semgrep are established, continuously-maintained tools
    with hundreds of professionally curated security rules; running them
    alongside our own detectors closes that gap without discarding the
    custom rules we already built and tested.

WHY subprocess, NOT importing these as Python libraries:
    Installing `semgrep` into the same virtual environment as FastAPI
    was tested and confirmed to break the backend -- semgrep's
    dependency chain silently overwrote `starlette` to an incompatible
    version (1.3.1 vs. FastAPI's required <0.42.0), causing
    `TypeError: Router.__init__() got an unexpected keyword argument`.
    Running these tools as isolated subprocess commands (installed via
    `pipx`, never `pip install` into backend/requirements.txt) avoids
    this entirely -- the backend never imports their code, only reads
    their JSON output.
"""

import json
import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

from app.models.security_schema import VulnerabilityFinding

logger = logging.getLogger(__name__)

_SUBPROCESS_TIMEOUT_SECONDS = 30

# Bandit's severity scale (LOW/MEDIUM/HIGH) has no CRITICAL level -- it
# reports confidence separately from severity. We map directly; Bandit
# never produces a "critical" finding through this mapping, which is
# accurate to how Bandit itself communicates risk.
_BANDIT_SEVERITY_MAP = {"LOW": "low", "MEDIUM": "medium", "HIGH": "high"}

# Semgrep's severity scale (INFO/WARNING/ERROR) maps to ours by rough
# equivalence: ERROR findings are typically real, actionable security
# issues (mapped to "high" rather than "critical" -- we reserve
# "critical" for our own hand-written rules on unambiguous
# remote-code-execution patterns like eval()/exec(), since Semgrep's
# registry rules span a wide severity range within "ERROR" itself).
_SEMGREP_SEVERITY_MAP = {"INFO": "low", "WARNING": "medium", "ERROR": "high"}


def _pick_owasp_2021_tag(owasp_tags: list[str]) -> str:
    """
    Semgrep's metadata often lists MULTIPLE OWASP edition tags per
    finding (e.g., 2017, 2021, AND 2025 versions simultaneously --
    confirmed against real output during integration testing). Showing
    all of them is noisy and inconsistent with our own custom rules,
    which are all written against the 2021 edition (see
    owasp_top10.md). This prefers the "2021" tag when present, falling
    back to the first available tag otherwise.
    """
    if not owasp_tags:
        return "Semgrep Finding"
    for tag in owasp_tags:
        if "2021" in tag:
            return tag
    return owasp_tags[0]


def _tool_available(tool_name: str) -> bool:
    """Checks the tool is actually installed and on PATH before trying
    to run it -- lets us fail gracefully (skip, log a warning) instead
    of crashing the whole review if a tool isn't installed on a given
    machine."""
    return shutil.which(tool_name) is not None


def run_bandit(code: str) -> list[VulnerabilityFinding]:
    """
    Runs Bandit against Python code and converts its findings into our
    VulnerabilityFinding schema.

    Bandit only supports Python -- this function is only ever called
    from the Python analyzer, never the Java one.
    """
    if not _tool_available("bandit"):
        logger.warning("bandit not found on PATH -- skipping. Install via: pipx install bandit")
        return []

    findings: list[VulnerabilityFinding] = []
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as tmp:
        tmp.write(code)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            ["bandit", "-f", "json", "-q", tmp_path],
            capture_output=True,
            text=True,
            timeout=_SUBPROCESS_TIMEOUT_SECONDS,
        )
        # Bandit exits non-zero when it finds issues -- that's expected,
        # not a failure. Only a missing/unparseable JSON output is a
        # real problem.
        if not result.stdout.strip():
            logger.warning("bandit produced no output (stderr: %s)", result.stderr)
            return []

        report = json.loads(result.stdout)
        for issue in report.get("results", []):
            bandit_severity = issue.get("issue_severity", "LOW")
            findings.append(VulnerabilityFinding(
                owasp_category=f"CWE-{issue['issue_cwe']['id']}" if issue.get("issue_cwe") else "Bandit Finding",
                rule_id=f"BANDIT_{issue.get('test_id', 'UNKNOWN')}",
                title=issue.get("test_name", "Bandit Finding").replace("_", " ").title(),
                description=issue.get("issue_text", ""),
                severity=_BANDIT_SEVERITY_MAP.get(bandit_severity, "low"),
                line=issue.get("line_number"),
                code_snippet=issue.get("code", "").strip().split("\n")[-1] if issue.get("code") else None,
            ))
    except subprocess.TimeoutExpired:
        logger.warning("bandit timed out after %ds -- skipping", _SUBPROCESS_TIMEOUT_SECONDS)
    except (json.JSONDecodeError, KeyError) as exc:
        logger.warning("bandit output could not be parsed: %s", exc)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return findings


def run_semgrep(code: str, language: str) -> list[VulnerabilityFinding]:
    """
    Runs Semgrep against Python or Java code using its auto-detected
    registry rule sets, and converts findings into our
    VulnerabilityFinding schema.

    WHY `--config=auto`?
        Pulls Semgrep's community-maintained rule packs appropriate for
        the detected language directly from its registry -- hundreds of
        rules we did not have to hand-write ourselves, which is the
        entire point of adding Semgrep per the mentor's feedback (using
        an established tool's comprehensive coverage, not a narrow
        hand-picked list).

    REQUIRES INTERNET ACCESS on first use (and periodically, as rule
    packs update) to fetch the registry configuration from semgrep.dev.
    This mirrors the same accepted trade-off already documented for
    `sentence-transformers` downloading model weights in the Knowledge
    Base pipeline -- a one-time/periodic network dependency for an
    offline-after-that capability, not a hidden fragility.
    """
    if not _tool_available("semgrep"):
        logger.warning("semgrep not found on PATH -- skipping. Install via: pipx install semgrep")
        return []

    extension = ".py" if language == "python" else ".java"
    findings: list[VulnerabilityFinding] = []
    with tempfile.NamedTemporaryFile(mode="w", suffix=extension, delete=False, encoding="utf-8") as tmp:
        tmp.write(code)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            ["semgrep", "--config=auto", "--json", "--quiet", tmp_path],
            capture_output=True,
            text=True,
            timeout=_SUBPROCESS_TIMEOUT_SECONDS,
        )
        if not result.stdout.strip():
            logger.warning("semgrep produced no output (stderr: %s)", result.stderr)
            return []

        report = json.loads(result.stdout)

        # Semgrep reports registry-fetch failures inside "errors", not
        # as a non-zero exit code alone -- surface this clearly rather
        # than silently returning zero findings, which could otherwise
        # look identical to "scanned successfully, found nothing."
        for err in report.get("errors", []):
            logger.warning("semgrep reported an error: %s", err.get("message", err))

        for issue in report.get("results", []):
            extra = issue.get("extra", {})
            semgrep_severity = extra.get("severity", "INFO")
            metadata = extra.get("metadata", {})
            owasp_tags = metadata.get("owasp", [])
            owasp_category = _pick_owasp_2021_tag(owasp_tags)

            # Semgrep's free/OSS CLI redacts the actual matched code line
            # (and fingerprint) unless the user is logged into a Semgrep
            # account -- it literally returns the string "requires login"
            # in place of real content. Confirmed against real output
            # during integration testing. Without this check, that
            # placeholder string would display in the UI as if it were
            # genuine source code -- a misleading result, not just a
            # missing one.
            raw_lines = extra.get("lines", "")
            code_snippet = raw_lines.strip() if raw_lines and raw_lines.strip() != "requires login" else None

            findings.append(VulnerabilityFinding(
                owasp_category=owasp_category,
                rule_id=f"SEMGREP_{issue.get('check_id', 'UNKNOWN').split('.')[-1].upper().replace('-', '_')}",
                title=issue.get("check_id", "Semgrep Finding").split(".")[-1].replace("-", " ").title(),
                description=extra.get("message", ""),
                severity=_SEMGREP_SEVERITY_MAP.get(semgrep_severity, "low"),
                line=issue.get("start", {}).get("line"),
                code_snippet=code_snippet,
            ))
    except subprocess.TimeoutExpired:
        logger.warning("semgrep timed out after %ds -- skipping", _SUBPROCESS_TIMEOUT_SECONDS)
    except (json.JSONDecodeError, KeyError) as exc:
        logger.warning("semgrep output could not be parsed: %s", exc)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return findings
