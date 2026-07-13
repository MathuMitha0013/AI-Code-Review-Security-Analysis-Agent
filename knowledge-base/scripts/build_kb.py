"""
build_kb.py — Orchestrates the full Knowledge Base pipeline.

    Documents -> Loader -> Chunker -> Embedder -> ChromaDB -> Knowledge Base Ready

This is a ONE-TIME (or periodically re-run) OFFLINE script — it is NOT
part of the live FastAPI backend and has no HTTP endpoint. Run it manually
whenever documents/ changes:

    python scripts/build_kb.py

WHY IS THIS A STANDALONE SCRIPT AND NOT A BACKEND API ROUTE?
    Ingestion is a heavy, slow, infrequent operation (loading PDFs,
    computing embeddings for potentially thousands of chunks). Running it
    inside a web request would block the server and risk request timeouts.
    Keeping it separate also means the FastAPI backend never needs
    heavyweight ML libraries (sentence-transformers, torch) as a runtime
    dependency — only this offline script does.
"""

import logging
import sys
from pathlib import Path

# Allow running this script directly (`python scripts/build_kb.py`)
# by adding the knowledge-base root to the path, so `from scripts.x import y`
# style absolute imports would also work if this pipeline is ever imported
# as a module by another script.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from langchain_chroma import Chroma

from scripts.chunker import chunk_documents
from scripts.embedder import get_embedding_function
from scripts.loader import load_documents

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

DOCUMENTS_DIR = Path(__file__).resolve().parent.parent / "documents"
CHROMA_PERSIST_DIR = Path(__file__).resolve().parent.parent / "chroma_store"
COLLECTION_NAME = "secure_coding_knowledge_base"


def build_knowledge_base() -> None:
    """
    Runs the full pipeline: load -> chunk -> embed -> persist to ChromaDB.
    """
    logger.info("=== Secoria Knowledge Base Build — Starting ===")

    # Stage 1: Load
    logger.info("Stage 1/4: Loading documents from %s", DOCUMENTS_DIR)
    documents = load_documents(DOCUMENTS_DIR)
    if not documents:
        logger.error("No documents loaded. Aborting build.")
        return

    # Stage 2: Chunk
    logger.info("Stage 2/4: Chunking documents")
    chunks = chunk_documents(documents)

    # Stage 3: Embed (model is loaded here; actual embedding computation
    # happens inside Chroma.from_documents in Stage 4)
    logger.info("Stage 3/4: Loading embedding model")
    embedding_function = get_embedding_function()

    # Stage 4: Store
    logger.info("Stage 4/4: Embedding chunks and persisting to ChromaDB at %s", CHROMA_PERSIST_DIR)
    Chroma.from_documents(
        documents=chunks,
        embedding=embedding_function,
        collection_name=COLLECTION_NAME,
        persist_directory=str(CHROMA_PERSIST_DIR),
    )

    logger.info("=== Knowledge Base Ready ===")
    logger.info("%d chunks indexed into collection '%s'", len(chunks), COLLECTION_NAME)
    logger.info(
        "NOTE: No retriever or query interface is built yet — that is "
        "Milestone 4 (Conversational RAG Assistant). This script's job "
        "ends here, per the Milestone 1 scope."
    )


if __name__ == "__main__":
    build_knowledge_base()
