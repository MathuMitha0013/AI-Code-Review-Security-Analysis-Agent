"""
Data contracts for the Conversational Code Assistant (RAG Chatbot - Milestone 3).

Follows the same isolated design pattern as submission_schema.py,
analysis_schema.py, security_schema.py, and remediation_schema.py — each
module has its own schema file, ensuring change isolation and clear contracts.
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Represents a single turn in a multi-turn chat conversation."""

    role: Literal["user", "assistant"] = Field(
        ..., description="The role of the message author: 'user' or 'assistant'"
    )
    content: str = Field(..., description="The textual content of the message")


class ChatRequest(BaseModel):
    """
    Incoming request payload for a new chat query.

    Accepts optional context fields (finding details + code snippet) to enable
    context-aware assistant replies when clicked from a finding item card.
    """

    message: str = Field(..., description="The user's current message/question")
    finding_title: Optional[str] = Field(
        default=None,
        description="The title of the active finding being discussed, if applicable",
    )
    code_snippet: Optional[str] = Field(
        default=None,
        description="The code snippet associated with the active finding, if applicable",
    )
    history: list[ChatMessage] = Field(
        default_factory=list,
        description="Prior message history in the conversation to maintain multi-turn chat memory",
    )


class SourceCitation(BaseModel):
    """Cites the origin document matching the retrieved context chunk."""

    source: str = Field(..., description="The name of the source file, e.g. 'Authentication_Cheat_Sheet.pdf'")
    page: Optional[int] = Field(
        default=None,
        description="The PDF page number the chunk originated from, if applicable",
    )
    content_snippet: Optional[str] = Field(
        default=None,
        description="A brief snippet of the matching content for transparency",
    )


class ChatResponse(BaseModel):
    """Outgoing response payload from the chat assistant."""

    reply: str = Field(..., description="The assistant's markdown-formatted answer")
    sources: list[SourceCitation] = Field(
        default_factory=list,
        description="List of document source citations used to answer the question",
    )
