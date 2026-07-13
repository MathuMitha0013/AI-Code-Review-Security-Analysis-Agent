"""
Chunker — Stage 2 of the Knowledge Base pipeline.

Responsibility: split loaded documents into smaller, overlapping chunks
sized appropriately for embedding and later retrieval.

WHY CHUNK AT ALL?
    1. Embedding models have a max input length. Our chosen model
       (all-MiniLM-L6-v2) has a 256-token context window — feeding it an
       entire document would silently truncate most of the content.
    2. Even without that limit, embedding an entire multi-page document as
       ONE vector dilutes its meaning — a query about "SQL injection" would
       match weakly against a giant vector representing 10 unrelated
       topics. Small, focused chunks let retrieval (Milestone 4) return
       the EXACT relevant paragraph, not "here's the whole document,
       good luck."

WHY CHARACTER-BASED SIZING, NOT TOKEN-BASED (tiktoken)?
    LangChain supports token-accurate splitting via
    `RecursiveCharacterTextSplitter.from_tiktoken_encoder()`, but this
    silently makes a NETWORK CALL on first use to download the tokenizer's
    vocabulary file. That is a hidden external dependency inside what
    should be a deterministic, offline-safe ingestion pipeline — it can
    fail unpredictably behind corporate firewalls, in CI/CD, or in
    restricted network environments (this bit us during development — see
    the Decision Log). Character-based sizing is fully self-contained and
    reproducible, at the cost of a small approximation (~4 characters per
    token for English text).
"""

import logging

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

# Character-based equivalents of our original token targets:
# ~300 tokens * ~4 chars/token ≈ 1200 characters
# ~50 tokens overlap * ~4 chars/token ≈ 200 characters
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200


def chunk_documents(
    documents: list[Document],
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> list[Document]:
    """
    Splits documents into smaller chunks using recursive character splitting.

    WHY "RECURSIVE" CHARACTER SPLITTING?
        It tries to split on natural boundaries first (markdown headers,
        then paragraph breaks, then sentences, then words) before falling
        back to a hard character cut. This avoids severing a sentence or
        code block mid-way whenever possible — producing more semantically
        coherent chunks than a naive fixed-length split.

    Args:
        documents: List of Document objects from the loader stage.
        chunk_size: Target chunk size in characters.
        chunk_overlap: Number of characters shared between consecutive chunks.

    Returns:
        A new, larger list of smaller Document chunks, each retaining the
        original document's metadata (so we always know which source file
        a chunk came from).
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        # Split on markdown/code-friendly boundaries first.
        separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " ", ""],
    )

    chunks = splitter.split_documents(documents)
    logger.info(
        "Split %d document(s) into %d chunk(s) (chunk_size=%d chars, overlap=%d chars)",
        len(documents),
        len(chunks),
        chunk_size,
        chunk_overlap,
    )
    return chunks
