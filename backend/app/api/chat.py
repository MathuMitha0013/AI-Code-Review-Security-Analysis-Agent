"""
Conversational Code Assistant API route (RAG Chatbot - Milestone 3).

Retrieves semantic context chunks from the cached ChromaDB vector store
(populated during offline ingestion) and prompts the Llama-3.3-70b-versatile
model on Groq with multi-turn history and local code context.
"""

import logging
import os
from typing import List

from fastapi import APIRouter, HTTPException, Request

from openai import OpenAI

from app.core.config import settings
from app.models.chat_schema import ChatRequest, ChatResponse, SourceCitation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: Request, payload: ChatRequest) -> ChatResponse:
    """
    RAG-powered conversational endpoint. Accepts user queries and context
    to output secure-coding guidelines and citations.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY is not configured. Set it in backend/.env to use the Chat Assistant.",
        )

    # 1. Retrieve the pre-loaded Chroma database from lifespan app.state
    vector_store = getattr(request.app.state, "vector_store", None)
    docs = []
    if vector_store is not None:
        query = payload.message
        try:
            docs = vector_store.similarity_search(query, k=3)
        except Exception as exc:
            logger.warning("Chroma DB similarity search failed: %s", exc)

    # 3. Format retrieved context chunks & build citation structures
    context_chunks = []
    sources: List[SourceCitation] = []

    for idx, doc in enumerate(docs):
        metadata = doc.metadata or {}
        raw_source = metadata.get("source", "Unknown Document")
        # Extract filename only for clean frontend rendering
        source_name = os.path.basename(raw_source)

        page_num = metadata.get("page")
        if page_num is not None:
            # PDF pages are 0-indexed in loaders; increment to 1-indexed for human readability
            try:
                page_num = int(page_num) + 1
            except (ValueError, TypeError):
                page_num = None

        content = doc.page_content.strip()
        context_chunks.append(
            f"[Document {idx+1}]: {source_name} (Page {page_num if page_num else 'N/A'})\n"
            f"Content:\n{content}\n"
        )

        # Deduplicate citations in the response structure
        is_dup = any(s.source == source_name and s.page == page_num for s in sources)
        if not is_dup:
            sources.append(
                SourceCitation(
                    source=source_name,
                    page=page_num,
                    content_snippet=content[:150] + "..." if len(content) > 150 else content,
                )
            )

    context_text = "\n---\n".join(context_chunks)

    # 4. Formulate System Prompt with retrieval context and finding context
    system_instruction = (
        "You are 'Secoria Chat Assistant', a senior secure-coding reviewer and mentor. "
        "Your task is to help the developer understand security vulnerabilities, code quality issues, "
        "and coding standards.\n\n"
        "GROUNDING CONTEXT:\n"
        "You have access to relevant secure coding guidelines retrieved from the project's Knowledge Base. "
        "You MUST answer the question using this retrieved context as your primary source of truth. "
        "If the context is insufficient or unrelated, answer using general secure development standards (like OWASP) "
        "but explicitly note that you are supplementing with general industry best practices.\n\n"
        "RETIREVED KNOWLEDGE BASE CHUNKS:\n"
        f"{context_text}\n"
    )

    if payload.finding_title:
        system_instruction += (
            "\nACTIVE FINDING CONTEXT (The developer is inspecting this issue):\n"
            f"Finding Title: {payload.finding_title}\n"
        )
    if payload.code_snippet:
        system_instruction += (
            "\nACTIVE CODE CONTEXT (Developer's submitted source code):\n"
            f"```\n{payload.code_snippet}\n```\n"
            "If the user asks about problems, vulnerabilities, or bugs in their code, analyze this source code directly, explain the specific problems found, and provide secure remediation steps grounded in OWASP best practices.\n"
        )

    # 5. Build messages array incorporating conversation history
    messages = [{"role": "system", "content": system_instruction}]

    for msg in payload.history:
        messages.append({"role": msg.role, "content": msg.content})

    # Append the user's active question
    messages.append({"role": "user", "content": payload.message})

    # 6. Invoke Groq API
    client = OpenAI(api_key=settings.GROQ_API_KEY or "key", base_url="https://api.groq.com/openai/v1")
    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=0.3,
        )
        reply = response.choices[0].message.content
    except Exception as exc:
        logger.error("Groq API completion failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to communicate with LLM service: {exc}",
        )

    return ChatResponse(reply=reply, sources=sources)
