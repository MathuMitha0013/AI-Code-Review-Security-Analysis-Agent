# Secoria — Decision Log

A running record of every significant technical decision made on this project, why it was made, what alternatives were considered, and the trade-offs accepted. Intended as direct reference material for mentor review.

---

## Architecture

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| Monorepo (`backend/`, `frontend/`, `knowledge-base/` in one repo) | Single reviewable repo, atomic commits across modules, appropriate for a solo internship project | Multi-repo (microservices, one repo per module) | Loses independent deployability — irrelevant at current scale |
| Layered backend architecture (`api/` / `services/` / `models/` / `core/`) | Testability, Single Responsibility Principle, lets future agents reuse `services/` logic without touching HTTP layer | Flat `main.py` with everything inline | Slightly more files upfront for a small module; pays off starting Milestone 2 |
| Empty `backend/app/agents/` folder reserved from day one | Signals clear architectural intent; future agents plug in without restructuring | Create the folder only when Milestone 2 starts | None — costs nothing to reserve a namespace early |
| Knowledge base as a standalone offline script, not a backend API route | Ingestion is slow/heavy (ML model loading); keeps the FastAPI runtime free of heavyweight ML dependencies (torch, sentence-transformers) | Expose ingestion as a `/api/build-kb` endpoint | Requires manually rerunning the script when source documents change (acceptable — documents change infrequently) |

---

## Submission Module

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| FastAPI over Flask/Django REST | Native async support, automatic OpenAPI docs, Pydantic-based validation built in | Flask + Marshmallow, Django REST Framework | None significant for an API-only service; Django would be needless overhead |
| One `/api/submit` endpoint handling both paste and file upload | Both paths converge on identical logic (detect → validate); avoids duplicating orchestration across two endpoints | Two separate endpoints (`/api/submit-code`, `/api/submit-file`) | Slightly more branching inside one handler, judged worth it for a smaller API surface |
| `ast.parse()` for Python syntax validation (standard library) | Zero extra dependency; validates syntax without ever executing code (security-critical — never `eval`/`exec` untrusted input) | `pylint`/`flake8` for validation | Those tools check style/lint issues beyond syntax — out of scope for Milestone 1 |
| `javalang` (pure-Python) for Java syntax validation | No JDK installation required — portable across any machine/CI without extra setup | Shell out to `javac` | `javalang` only supports Java 8-era grammar; newer syntax (records, sealed classes) may not parse — accepted for Milestone 1, revisit if needed |
| 1MB max file upload size | Basic resource-exhaustion protection against large/malicious uploads | No limit | None — generous for a single source file |
| Vite over Create React App | Native ES module dev server, fast HMR; CRA is officially deprecated by the React team | Create React App | None — no remaining advantage to CRA |
| Tailwind CSS v4 (`@tailwindcss/vite`) | Utility-first styling, native dark-mode variant support, new Rust-based engine is significantly faster than v3 | Plain CSS, Bootstrap, Tailwind v3 | v4's CSS-first config (`@custom-variant`) is a newer pattern with less community tutorial content than v3 |
| Dark/light mode via class-based toggle + CSS custom properties, not `prefers-color-scheme` only | Gives the user explicit control (persisted via `localStorage`) in addition to respecting OS preference on first visit | OS-preference-only (`prefers-color-scheme` media query) | Slightly more implementation (ThemeContext) vs. zero-code OS-only approach |
| React Context (`ThemeContext`) for theme state, not Redux/Zustand | Single global value; Context is built into React with zero extra dependencies | Redux, Zustand | Would need to migrate if global state grows significantly more complex (e.g., Milestone 3 findings state) |
| Plain `<textarea>` for code input, not Monaco/CodeMirror | Milestone 1 only needs to capture and submit text; a full editor is a large dependency (~5MB) not yet justified | Monaco Editor, CodeMirror | No syntax highlighting in the input box yet — swapping this in later is an isolated change to one component |

---

## Secure Coding Knowledge Base

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| ChromaDB for vector storage | Free, local, file-based persistence with metadata support out of the box; first-class LangChain integration | FAISS, Pinecone | FAISS lacks built-in persistence/metadata; Pinecone is paid and cloud-only — unjustified for this scale |
| `sentence-transformers/all-MiniLM-L6-v2` for embeddings | Free, runs entirely locally (no API key/cost), small (~80MB), fast on CPU | OpenAI `text-embedding-3-small` | Lower embedding quality than OpenAI's models — acceptable trade-off for zero cost; revisit if Milestone 4 retrieval quality is insufficient |
| Character-based chunk sizing (`len` function), not token-based (`tiktoken`) | `tiktoken`'s `from_tiktoken_encoder()` silently requires a network call to download tokenizer vocabulary on first use — a hidden fragility discovered during development that breaks in restricted/offline network environments | Token-based chunking via tiktoken | Character count is an approximation of token count (~4 chars/token), slightly less precise than true token-based sizing |
| `RecursiveCharacterTextSplitter` with markdown-aware separators | Splits on natural boundaries (headers, paragraphs, sentences) before falling back to hard cuts — produces more coherent chunks | Fixed-length naive splitting | None meaningful |
| `PyMuPDF` for PDF loading | Fast, minimal dependencies, sufficient for text extraction from OWASP Cheat Sheet PDFs | `unstructured` library | `unstructured` is much heavier (pulls in OCR and many format parsers not needed here) |
| Python 3.12 (not 3.13) for the knowledge-base virtual environment | `chromadb` pulls in `onnxruntime`, which pins `numpy<2`; `numpy 1.26.x` has no prebuilt wheel for Python 3.13, forcing a source compile that fails without a C compiler installed. Python 3.12 has prebuilt wheels for the full dependency chain | Install Visual Studio Build Tools to compile numpy from source on Python 3.13 | Requires maintaining two Python versions locally (3.13 for backend, 3.12 for knowledge-base) — a minor inconvenience, clearly documented |
| No retriever, LLM, or chatbot built in Milestone 1 | Scope discipline — Milestone 1 explicitly ends at "Knowledge Base Ready." Building a retriever now would be speculative, untested-against-real-usage code (YAGNI) | Build a basic retriever now to "get ahead" | None — this is a deliberate, documented scope boundary, not an oversight |

---

## Planned Tooling — Milestone 2 (Not Yet Implemented)

The following tools were provided by the mentor as the expected toolkit for the Code Analysis Agent and Security Vulnerability Agent. None are implemented in Milestone 1 — listed here for traceability, mapped to where each will plug into the existing architecture.

| Library | Purpose | Agent | Plugs into |
|---|---|---|---|
| `AST` (Python, built-in) | Syntax tree parsing | — | Already in use in Milestone 1 (`syntax_validator.py`) |
| `Bandit` | Python security vulnerability scanner | Security Vulnerability Agent | `backend/app/agents/security/` |
| `Semgrep` | Security + code smell detection (Python & Java) | Code Analysis + Security Agents | `backend/app/agents/security/`, `backend/app/agents/code_analysis/` |
| `Pylint` | Python code quality / coding standards | Code Analysis Agent | `backend/app/agents/code_analysis/` |
| `Flake8` | PEP-8 style checking | Code Analysis Agent | `backend/app/agents/code_analysis/` |
| `Radon` | Code complexity metrics | Code Analysis Agent | `backend/app/agents/code_analysis/` |
| `Tree-sitter` | Multi-language source parser | Code Analysis Agent | `backend/app/agents/code_analysis/` |
| `SpotBugs` / `FindSecBugs` | Java bug/security detection | Security Vulnerability Agent | `backend/app/agents/security/` |
| `PMD` / `Checkstyle` | Java code smells / coding standards | Code Analysis Agent | `backend/app/agents/code_analysis/` |
| `JavaParser` | Full Java AST parser (JVM-based) | Code Analysis Agent | `backend/app/agents/code_analysis/` |
| `SonarQube` | Combined bugs/vulnerabilities/smells | Cross-cutting (both agents) | `backend/app/agents/` (orchestration level) |

**Note on overlap with Milestone 1:** Milestone 1 used `javalang` (pure-Python, lightweight) purely for a valid/invalid syntax check in the Submission Module — a different tool from `JavaParser` (full JVM-based AST parser), which Milestone 2 needs for deeper structural code analysis. These are not redundant; they serve different depths of parsing at different stages of the pipeline.

---

## Known Follow-ups for Future Milestones

- Replace/supplement the seed markdown documents in `knowledge-base/documents/` with real OWASP Cheat Sheet PDFs before final submission.
- `langchain-community` is in maintenance/sunset mode upstream — consider migrating to standalone integration packages if this project continues past the internship.
- Re-evaluate embedding model choice (`all-MiniLM-L6-v2` vs. a larger model) once Milestone 4's retriever is built and retrieval quality can be measured empirically.
