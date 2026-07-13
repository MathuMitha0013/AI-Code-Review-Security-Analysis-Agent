"""
Document loader — Stage 1 of the Knowledge Base pipeline.

Responsibility: read raw files from `documents/` and convert them into
LangChain `Document` objects (text + metadata), regardless of source
format (.md, .txt, .pdf).

WHY A SEPARATE FILE FOR THIS, INSTEAD OF INLINING IN build_kb.py?
    Each pipeline stage (load, chunk, embed, store) is independently
    testable and independently replaceable. If we later need a loader for
    a new format (e.g., .docx), we add a branch here without touching
    chunking or embedding logic at all.
"""

import logging
from pathlib import Path

from langchain_community.document_loaders import (
    DirectoryLoader,
    PyMuPDFLoader,
    TextLoader,
)
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

# Maps file extensions to the LangChain loader class responsible for them.
# Adding PDF support later (e.g., real OWASP Cheat Sheet PDFs) required
# ZERO changes beyond this dict already having the .pdf entry below.
_LOADER_BY_EXTENSION = {
    ".md": TextLoader,
    ".txt": TextLoader,
    ".pdf": PyMuPDFLoader,
}


def load_documents(documents_dir: str | Path) -> list[Document]:
    """
    Loads every supported file under `documents_dir` into a list of
    LangChain Document objects.

    Args:
        documents_dir: Path to the folder containing source documents.

    Returns:
        A list of Document objects, each with `.page_content` (raw text)
        and `.metadata` (at minimum, the source filename).

    Raises:
        FileNotFoundError: if `documents_dir` does not exist.
    """
    documents_dir = Path(documents_dir)
    if not documents_dir.exists():
        raise FileNotFoundError(f"Documents directory not found: {documents_dir}")

    all_documents: list[Document] = []

    for extension, loader_cls in _LOADER_BY_EXTENSION.items():
        # DirectoryLoader finds all files matching the glob pattern and
        # applies the given loader class to each one.
        loader = DirectoryLoader(
            str(documents_dir),
            glob=f"**/*{extension}",
            loader_cls=loader_cls,
            show_progress=False,
        )
        loaded = loader.load()
        if loaded:
            logger.info("Loaded %d %s document(s)", len(loaded), extension)
        all_documents.extend(loaded)

    if not all_documents:
        logger.warning(
            "No documents found in %s. Add .md, .txt, or .pdf files before building the knowledge base.",
            documents_dir,
        )

    return all_documents
