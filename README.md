# Secoria

**AI Code Review & Security Analysis Agent**
*Infosys Springboard Internship Project*

Secoria is an intelligent, multi-agent platform that automatically analyzes source code for quality issues, security vulnerabilities, and best-practice violations — reducing manual code review effort and accelerating secure development.

> **Current Status:** Milestone 1 (Submission Module + Secure Coding Knowledge Base)

---

## Table of Contents

- [Project Vision](#project-vision)
- [Milestone Progress](#milestone-progress)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Tech Stack & Dependencies](#tech-stack--dependencies)
- [Installation](#installation)
- [Features](#features-milestone-1)
- [Screenshots](#screenshots)
- [Future Scope](#future-scope)
- [License](#license)

---

## Project Vision

Software teams struggle with inconsistent code quality, undetected security vulnerabilities, and slow manual reviews. Secoria addresses this with a multi-agent AI pipeline:

| Agent | Responsibility | Milestone |
|---|---|---|
| Code Analysis Agent | Detects code smells, design anti-patterns, complexity issues | Future |
| Security Vulnerability Agent | Scans for OWASP-standard vulnerabilities (SQLi, XSS, CSRF, hardcoded secrets, etc.) | Future |
| Remediation Agent | Generates fix recommendations with corrected code | Future |
| PR Summary Agent | Compiles findings into a human-readable review summary | Future |
| Conversational Code Assistant | RAG-powered Q&A grounded in secure coding knowledge base | Future |

---

## Milestone Progress

- [x] **Milestone 1 — Foundations** ✅ Complete & verified
  - [x] System architecture & folder structure designed
  - [x] Code Submission Module (paste/upload Python & Java, language detection, syntax validation) — 7/7 backend tests passing, frontend built & linted
  - [x] Secure Coding Knowledge Base (OWASP + secure coding docs → chunked → embedded → ChromaDB) — pipeline verified end-to-end, 12 chunks indexed
- [ ] Milestone 2 — Multi-Agent Orchestration & Analysis Pipeline (planned tooling: Bandit, Semgrep, Pylint, Flake8, Radon, Tree-sitter, SpotBugs, FindSecBugs, PMD, Checkstyle, JavaParser, SonarQube — see [Decision Log](docs/decision-log.md))
- [ ] Milestone 3 — Findings Display & Severity Scoring
- [ ] Milestone 4 — Conversational Code Assistant (RAG retriever + chat UI)
- [ ] Milestone 5 — Code Review Report Generation & Export

---

## Architecture

Secoria is a **monorepo** with three independently runnable systems, connected by a stable data contract (Submission response schema) and a shared data artifact (the ChromaDB knowledge base).

```
┌─────────────────┐        HTTP (JSON)        ┌──────────────────┐
│  React Frontend  │ ────────────────────────► │  FastAPI Backend  │
│  (Vite + Tailwind)│ ◄──────────────────────── │  (Layered/Clean)  │
└─────────────────┘                            └──────────────────┘
                                                          │
                                                          │ (Milestone 2+ reads)
                                                          ▼
                                                ┌──────────────────┐
                                                │  ChromaDB Vector  │
                                                │  Store (built by   │
                                                │  knowledge-base/)  │
                                                └──────────────────┘
```

The backend follows a **layered (Clean) architecture**:

```
api/       → HTTP routes only (thin controllers)
services/  → Business logic (language detection, syntax validation)
models/    → Pydantic request/response schemas (the "contract")
core/      → Config, logging (cross-cutting concerns)
agents/    → Reserved, empty in Milestone 1 — future agents plug in here
```

This design follows the **Open/Closed Principle**: future milestones extend the system by adding new files (new agents, new routes, a retriever module) without modifying Milestone 1 code.

Full reasoning for every architectural decision — including alternatives considered and trade-offs accepted — is documented in [`docs/decision-log.md`](docs/decision-log.md). This is the single most useful document for mentor review Q&A.

---

## Folder Structure

```
secoria/
├── backend/               FastAPI application (Submission Module)
│   ├── app/
│   │   ├── api/            Route definitions
│   │   ├── core/            Config & logging
│   │   ├── models/           Pydantic schemas
│   │   ├── services/          Language detection & syntax validation logic
│   │   └── agents/            Reserved for Milestone 2+ (empty)
│   ├── tests/
│   └── requirements.txt
├── frontend/               React + Vite + Tailwind UI
│   └── src/
│       ├── components/      CodeEditor, FileUpload, ResultPanel, ThemeToggle
│       ├── context/          ThemeContext (dark/light mode)
│       └── services/          API client
├── knowledge-base/         Offline ingestion pipeline
│   ├── documents/           Raw OWASP / secure coding source docs
│   ├── scripts/              loader → chunker → embedder → build_kb
│   └── chroma_store/          Persisted vector database (generated, gitignored)
├── docs/
│   ├── architecture.md
│   └── decision-log.md
├── LICENSE
└── README.md
```

---

## Tech Stack & Dependencies

### Backend
| Package | Purpose |
|---|---|
| `fastapi` | Web framework — async, auto-generated OpenAPI docs, Pydantic-native validation |
| `uvicorn` | ASGI server to run the FastAPI app |
| `python-multipart` | Enables `UploadFile` handling for file uploads |
| `pydantic` | Data validation and schema definitions (contract between frontend/backend) |

### Frontend
| Package | Purpose |
|---|---|
| `react` | UI library, component-based architecture |
| `vite` | Fast dev server & build tool |
| `tailwindcss` | Utility-first styling, native dark-mode support |

### Knowledge Base
| Package | Purpose |
|---|---|
| `langchain` | Document loading & chunking orchestration |
| `langchain-community` | Community document loaders (PDF, text, etc.) |
| `langchain-chroma` | LangChain ↔ ChromaDB integration |
| `chromadb` | Local, file-based vector database |
| `sentence-transformers` | Generates embeddings locally (free, no API key) |
| `pymupdf` | PDF text extraction |

> Each dependency is explained in depth — why it was chosen, what it replaces, and mentor Q&A — in the corresponding module's section of `docs/decision-log.md`.

---

## Installation

*(Full step-by-step setup is documented as we build each module. See `backend/README.md` and `frontend/README.md` once created.)*

```powershell
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Knowledge Base (one-time build)
# NOTE: requires Python 3.12 specifically (not 3.13) — see docs/decision-log.md
cd knowledge-base
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python scripts/build_kb.py
```

---

## Features (Milestone 1)

- Paste Python or Java code directly into a syntax-highlighted editor
- Upload `.py` or `.java` files
- Automatic programming language detection
- Syntax validation with clear error reporting
- Fully responsive UI with **dark and light mode**
- Secure coding knowledge base indexed from OWASP & language-specific secure coding standards (ready for future RAG retrieval)

---

## Screenshots

*(To be added once the UI is built)*

| Light Mode | Dark Mode |
|---|---|
| _placeholder_ | _placeholder_ |

---

## Future Scope

- Multi-agent orchestration pipeline (LangChain/LangGraph) coordinating Code Analysis, Security, Remediation, and PR Summary agents
- Severity-scored findings dashboard
- RAG-powered conversational assistant grounded in the secure coding knowledge base
- Exportable PDF/Markdown code review reports
- CI/CD integration (GitHub Actions bot for automated PR reviews)

---

## License

This project is licensed under the [MIT License](LICENSE).
