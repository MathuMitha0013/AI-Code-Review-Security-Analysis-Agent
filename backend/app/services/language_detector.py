"""
Language detection service.

Placed under `services/` (not `api/`) so this logic is:
  1. Unit-testable in isolation, without a running web server.
  2. Reusable by future agents (e.g., Code Analysis Agent also needs to
     know the language before it picks language-specific analysis rules).

This is the Single Responsibility Principle in action: this file's ONLY
job is "given code and/or a filename, what language is it?"
"""

import logging

from app.models.submission_schema import SupportedLanguage

logger = logging.getLogger(__name__)

# Filename extension is the most reliable signal — check it first.
_EXTENSION_MAP: dict[str, SupportedLanguage] = {
    ".py": "python",
    ".java": "java",
}

# Fallback heuristics for pasted code with no filename.
# These are intentionally simple keyword/pattern checks — NOT a full
# language classifier. Good enough for Milestone 1; a mentor question
# about this is answered below.
_PYTHON_SIGNALS = ("def ", "elif ", "self.", "import ", "from ", "print(", "class ", "__init__", "lambda ", ":\n")
_JAVA_SIGNALS = ("public class", "public static void main", "System.out.println", "private ", "public ", "protected ", "void ", "throws ", "package ", "extends ", "implements ", "import java", "import javax")


def detect_language(code: str, filename: str | None = None) -> SupportedLanguage:
    """
    Detects whether submitted code is Python, Java, or unknown.

    Args:
        code: The raw source code text.
        filename: Optional original filename (used for extension-based detection).

    Returns:
        One of "python", "java", "unknown".
    """
    if filename:
        for ext, lang in _EXTENSION_MAP.items():
            if filename.lower().endswith(ext):
                logger.info("Language detected via file extension: %s -> %s", filename, lang)
                return lang

    # No filename or unrecognized extension -> check content heuristics.
    python_score = sum(signal in code for signal in _PYTHON_SIGNALS)
    java_score = sum(signal in code for signal in _JAVA_SIGNALS)

    if python_score == 0 and java_score == 0:
        logger.warning("Could not detect language from content heuristics.")
        return "unknown"

    detected: SupportedLanguage = "java" if java_score > python_score else "python"

    # AST-based verification to prevent false misclassification on close scores
    import ast
    import javalang
    try:
        ast.parse(code)
        is_valid_py = True
    except Exception:
        is_valid_py = False

    try:
        javalang.parse.parse(code)
        is_valid_java = True
    except Exception:
        is_valid_java = False

    if is_valid_py and not is_valid_java:
        detected = "python"
    elif is_valid_java and not is_valid_py:
        detected = "java"

    logger.info(
        "Language detected (python_score=%d, java_score=%d, valid_py=%s, valid_java=%s) -> %s",
        python_score,
        java_score,
        is_valid_py,
        is_valid_java,
        detected,
    )
    return detected
