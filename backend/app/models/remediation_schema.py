"""
Data contracts for the Remediation Agent.

Separate schema file, same reasoning as every prior agent (analysis_schema.py,
security_schema.py): this agent's contract is scoped to its own needs and
evolves independently.
"""

from pydantic import BaseModel, Field


class RemediationRequest(BaseModel):
    """
    Input for a single remediation request — always scoped to ONE finding,
    not a whole review's worth. See agent.py for why remediation is
    on-demand per-finding rather than automatic for every finding.
    """

    finding_title: str = Field(..., description="The finding's title, e.g. 'SQL Injection via String Concatenation'")
    finding_description: str = Field(..., description="The finding's existing description/explanation")
    code_snippet: str = Field(..., description="The specific flagged line(s) of code")
    language: str = Field(..., description="'python' or 'java'")
    full_code: str | None = Field(
        default=None,
        description="The full submitted code, for surrounding context. Optional -- "
        "improves fix quality but isn't required.",
    )


class RemediationResult(BaseModel):
    """
    The LLM's structured output. This exact shape is passed as
    `response_schema` to Gemini, which returns JSON conforming to it
    directly (via the SDK's `response.parsed`) -- no manual free-text
    parsing required.
    """

    explanation: str = Field(..., description="Plain-language explanation of why this is a problem")
    fixed_code: str = Field(..., description="Corrected code addressing the finding")
    best_practice_notes: str = Field(..., description="Broader guidance related to this class of issue")


class RemediationResponse(BaseModel):
    """The full API response — the original finding's title plus its remediation."""

    finding_title: str
    remediation: RemediationResult
