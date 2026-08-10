"""
Data contracts for the Submission Module.

WHY THIS FILE MATTERS MOST FOR FUTURE MILESTONES:
    `SubmissionResponse` is the stable "handshake" between the frontend and
    backend TODAY, and between the Submission Module and every future Agent
    TOMORROW. The Code Analysis Agent (Milestone 2) will receive this exact
    object as its input. If we change this schema carelessly later, every
    downstream agent breaks. This is why we design it carefully now, even
    though only two fields (`language`, `is_valid`) are used in Milestone 1.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field

# Literal type restricts `language` to exactly these values.
# Why Literal instead of `str`? It gives us compile-time-like safety —
# if a future agent typos "phython", type checkers (mypy) catch it,
# and Pydantic rejects it at the API boundary before it reaches business logic.
SupportedLanguage = Literal["python", "java", "unknown"]


class SubmissionResponse(BaseModel):
    """
    Response returned after a code submission (paste or file upload)
    is analyzed by the Submission Module.
    """

    language: SupportedLanguage = Field(
        ..., description="Detected programming language of the submitted code."
    )
    is_valid: bool = Field(
        ..., description="True if the code has no syntax errors."
    )
    error: Optional[str] = Field(
        default=None,
        description="Syntax error message if `is_valid` is False, otherwise null.",
    )
    filename: Optional[str] = Field(
        default=None,
        description="Original filename if the code was submitted via file upload.",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "language": "python",
                    "is_valid": False,
                    "error": "SyntaxError: expected ':' at line 3",
                    "filename": "example.py",
                }
            ]
        }
    }
