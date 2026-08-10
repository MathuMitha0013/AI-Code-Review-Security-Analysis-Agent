"""
External Code Quality Scanner Integrations — Pylint and Flake8 (Python).

Same rationale as app/agents/security/external_scanners.py: our own
hand-written AST rules in python_analyzer.py only catch the specific
patterns we thought to check for (Long Method, Too Many Parameters,
etc.). Pylint and Flake8 are established, continuously-maintained
linters with hundreds of additional checks (unused variables, missing
docstrings, style violations, likely bugs) that broaden coverage well
beyond our hand-picked list -- addressing the same "work with the tool,
don't preset it" feedback that motivated the security-side integration.

WHY NO JAVA EQUIVALENT HERE (PMD/Checkstyle)?
    Both are JVM-based CLI tools requiring a JDK -- a dependency
    Milestone 1 deliberately avoided by choosing `javalang` (pure
    Python, no JDK) for Java parsing. Documented as a Phase 2 follow-up
    in the Decision Log rather than silently skipped.

WHY subprocess, not importing as libraries: same reasoning as
external_scanners.py -- keeps these tools' dependency trees fully
isolated from the FastAPI backend's own (installed via `pipx`, never
`pip install` into backend/requirements.txt).
"""

import json
import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

from app.models.analysis_schema import Finding

logger = logging.getLogger(__name__)

_SUBPROCESS_TIMEOUT_SECONDS = 30

# Pylint's message types map to our severity scale by rough
# equivalence: fatal/error indicate real bugs; warning is a genuine
# concern; convention/refactor are style/maintainability suggestions.
_PYLINT_SEVERITY_MAP = {
    "fatal": "critical",
    "error": "high",
    "warning": "medium",
    "refactor": "low",
    "convention": "low",
}


def _tool_available(tool_name: str) -> bool:
    return shutil.which(tool_name) is not None


def run_pylint(code: str) -> list[Finding]:
    """Runs Pylint against Python code and converts findings into our
    Finding schema."""
    if not _tool_available("pylint"):
        logger.warning("pylint not found on PATH -- skipping. Install via: pipx install pylint")
        return []

    findings: list[Finding] = []
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as tmp:
        tmp.write(code)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            [
                "pylint",
                "--output-format=json",
                # Documentation-only conventions (missing docstrings) fire
                # on nearly all code regardless of actual quality, and
                # don't serve a security/quality review tool's purpose --
                # disabled deliberately, not to hide results, but because
                # they'd drown out genuinely important findings (unused
                # variables, likely bugs, etc.) with pure documentation
                # nagging. Every other Pylint check remains fully active.
                "--disable=missing-module-docstring,missing-function-docstring,missing-class-docstring",
                tmp_path,
            ],
            capture_output=True,
            text=True,
            timeout=_SUBPROCESS_TIMEOUT_SECONDS,
        )
        if not result.stdout.strip():
            logger.warning("pylint produced no output (stderr: %s)", result.stderr)
            return []

        issues = json.loads(result.stdout)
        for issue in issues:
            pylint_type = issue.get("type", "convention")
            findings.append(Finding(
                category="best_practice",
                rule=f"PYLINT_{issue.get('symbol', 'unknown').upper().replace('-', '_')}",
                message=issue.get("message", ""),
                severity=_PYLINT_SEVERITY_MAP.get(pylint_type, "low"),
                function_name=issue.get("obj") or None,
                line=issue.get("line"),
            ))
    except subprocess.TimeoutExpired:
        logger.warning("pylint timed out after %ds -- skipping", _SUBPROCESS_TIMEOUT_SECONDS)
    except (json.JSONDecodeError, KeyError) as exc:
        logger.warning("pylint output could not be parsed: %s", exc)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return findings


def run_flake8(code: str) -> list[Finding]:
    """
    Runs Flake8 against Python code and converts findings into our
    Finding schema.

    WHY LINE-BASED PARSING, NOT --format=json?
        Flake8's default output format is stable, documented, and
        available in every version without an extra plugin --
        `file:line:col: CODE message`. Verified against real output on
        the developer's machine during integration testing.
    """
    if not _tool_available("flake8"):
        logger.warning("flake8 not found on PATH -- skipping. Install via: pipx install flake8")
        return []

    findings: list[Finding] = []
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as tmp:
        tmp.write(code)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            ["flake8", tmp_path],
            capture_output=True,
            text=True,
            timeout=_SUBPROCESS_TIMEOUT_SECONDS,
        )
        # Flake8 exits non-zero when it finds issues -- expected, not a
        # failure. Parse stdout regardless of exit code.
        for line in result.stdout.strip().splitlines():
            if not line.strip():
                continue
            # Format: <path>:<line>:<col>: <code> <message>
            try:
                _, line_no, _col, rest = line.split(":", 3)
                code_and_message = rest.strip()
                flake8_code, message = code_and_message.split(" ", 1)
            except ValueError:
                logger.warning("flake8 line could not be parsed: %s", line)
                continue

            # F-codes (pyflakes) indicate real logic issues (unused
            # imports, undefined names); E/W-codes are style. This
            # distinction matters for severity -- an undefined variable
            # is a bug, a missing blank line is not.
            severity = "medium" if flake8_code.startswith("F") else "low"

            findings.append(Finding(
                category="best_practice",
                rule=f"FLAKE8_{flake8_code}",
                message=message.strip(),
                severity=severity,
                line=int(line_no) if line_no.isdigit() else None,
            ))
    except subprocess.TimeoutExpired:
        logger.warning("flake8 timed out after %ds -- skipping", _SUBPROCESS_TIMEOUT_SECONDS)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return findings
