"""
Data contracts for the PR Summary Agent (Milestone 3).

Exposes the response contract for the LLM-compiled review comments.
Reuses the UnifiedReviewReport contract from orchestrator/schemas.py directly
as the incoming request payload structure.
"""

from pydantic import BaseModel, Field


class PRSummaryResponse(BaseModel):
    """Outgoing response payload containing the LLM-compiled PR summary comment."""

    markdown: str = Field(
        ...,
        description="The generated Pull Request review summary formatted in Markdown",
    )
