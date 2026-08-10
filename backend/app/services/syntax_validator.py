"""
Syntax validation service.

Design decision: each language gets its OWN validator function rather than
one giant if/else block. This follows the Open/Closed Principle — adding
support for a third language (e.g., JavaScript in a future milestone) means
adding a new function and one dict entry, not rewriting existing logic.
"""

import ast
import logging

import javalang

from app.models.submission_schema import SupportedLanguage

logger = logging.getLogger(__name__)


def _validate_python(code: str) -> tuple[bool, str | None]:
    """
    Validates Python syntax using the standard library's `ast` module.

    Why `ast.parse` and not `compile()`?
        `ast.parse` performs a pure syntax check (builds the Abstract Syntax
        Tree) without generating bytecode. `compile()` would also work but
        implies "this code is about to be executed" — a subtle but important
        distinction. We NEVER execute user-submitted code in Milestone 1
        (or any milestone) for security reasons — arbitrary code execution
        from user input is a critical vulnerability we must avoid entirely.
    """
    try:
        ast.parse(code)
        return True, None
    except SyntaxError as exc:
        error_message = f"SyntaxError: {exc.msg} at line {exc.lineno}"
        logger.info("Python syntax error detected: %s", error_message)
        return False, error_message


def _validate_java(code: str) -> tuple[bool, str | None]:
    """
    Validates Java syntax using `javalang`, a pure-Python Java parser.

    Limitation to be upfront about: `javalang` implements Java grammar up
    to Java 8 syntax. Newer Java features (e.g., records, sealed classes
    from Java 17+) may not parse. This is an accepted trade-off for
    Milestone 1 — documented in the Decision Log — since a full JDK
    dependency is far heavier than our needs justify right now.
    """
    try:
        javalang.parse.parse(code)
        return True, None
    except javalang.parser.JavaSyntaxError as exc:
        error_message = f"JavaSyntaxError: {exc}"
        logger.info("Java syntax error detected: %s", error_message)
        return False, error_message
    except (javalang.tokenizer.LexerError, Exception) as exc:
        # javalang raises broad/uncommon exceptions for malformed input
        # (e.g., unterminated strings). We catch generically here so the
        # API never crashes on malformed input — it always returns a
        # structured error instead.
        error_message = f"JavaSyntaxError: unable to parse — {exc}"
        logger.info("Java parsing failed: %s", error_message)
        return False, error_message


# Dispatch table: maps language -> validator function.
# Adding a new language later = one new entry here, zero changes elsewhere.
_VALIDATORS = {
    "python": _validate_python,
    "java": _validate_java,
}


def validate_syntax(code: str, language: SupportedLanguage) -> tuple[bool, str | None]:
    """
    Validates syntax for the given language.

    Returns:
        (is_valid, error_message) — error_message is None when is_valid is True.
    """
    validator = _VALIDATORS.get(language)
    if validator is None:
        # language == "unknown"
        return False, "Cannot validate syntax: unsupported or undetected language."
    return validator(code)
