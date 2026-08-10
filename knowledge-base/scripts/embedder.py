"""
Embedder — Stage 3 of the Knowledge Base pipeline.

Responsibility: provide the embedding model that converts text chunks into
vectors (arrays of numbers) that capture semantic meaning — chunks about
similar topics end up as vectors that are mathematically "close" together.

WHY THIS MODEL: sentence-transformers/all-MiniLM-L6-v2
    - Free and runs entirely locally (no API key, no per-call cost) —
      important for a student project with no budget for paid embedding APIs.
    - Small (~80MB), fast on CPU — no GPU required, works on any laptop.
    - Well-established general-purpose embedding model, widely used as a
      baseline in production RAG systems and in LangChain tutorials/docs.

TRADE-OFF (documented for mentor review):
    Larger models (e.g., OpenAI's text-embedding-3-large, or
    BAAI/bge-large) produce higher-quality embeddings and would likely
    improve retrieval accuracy in Milestone 4. We're accepting slightly
    lower embedding quality in exchange for zero cost and zero external
    dependency — a deliberate, reasonable trade-off for this project stage.
"""

import logging

from langchain_huggingface import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def get_embedding_function() -> HuggingFaceEmbeddings:
    """
    Returns a LangChain-compatible embedding function backed by a local
    sentence-transformers model.

    This function is called from `build_kb.py` (to embed + store chunks)
    AND will be called identically from Milestone 4's retriever — using
    the SAME embedding model for both indexing and querying is mandatory:
    a query embedded with a different model than the one used to build
    the index would produce meaningless similarity scores.
    """
    logger.info("Loading embedding model: %s (first run downloads ~80MB)", EMBEDDING_MODEL_NAME)
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
