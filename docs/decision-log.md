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
| Explicit ChromaDB client construction with `Settings(anonymized_telemetry=False)`, instead of relying on the `ANONYMIZED_TELEMETRY` environment variable alone | The env var alone was unreliable — `langchain-chroma`'s internal client construction didn't consistently respect it in `chromadb==0.5.23`, so the telemetry call still fired and errored | Environment variable only | None — the explicit `Settings` object is strictly more reliable |
| Pinned `posthog<3.0.0` | `chromadb==0.5.23`'s telemetry code calls `posthog.capture()` using an older positional-argument signature; `posthog>=3.0` changed that signature, causing a repeated `ERROR` log on every pipeline run (`capture() takes 1 positional argument but 3 were given`) | Ignore the error (it's non-fatal — pipeline output was unaffected) | None — a clean pin is simple and removes log noise entirely, at negligible cost |
| Supplemented (not replaced) the 5 self-authored markdown documents with 9 official OWASP Cheat Sheet Series PDFs (Authorization, Authentication, Cryptographic Failures, Insecure Deserialization, Input Validation, Secrets Management, SQL Injection, TLS/SSL, XML Security) | Self-authored content was accurate but not authoritative — real OWASP source material gives the knowledge base genuine grounding in the actual industry-standard reference, not a paraphrase of it. Kept the markdown too since it's already tested, working content covering topics (code quality patterns, common bug patterns) the OWASP cheat sheets don't address | Replace markdown entirely with PDFs | None — more source coverage at zero cost, since `PyMuPDFLoader` was already wired to `.pdf` in Milestone 1 specifically for this moment; zero code changes needed |
| No code changes required to ingest PDFs | `loader.py`'s extension-to-loader-class dictionary already mapped `.pdf` → `PyMuPDFLoader` back in Milestone 1, anticipating this exact addition | — | Direct validation that the Open/Closed Principle reasoning from Milestone 1 held up in practice, not just in theory |
| `PyMuPDFLoader` creates one Document per PDF page, not one per file | This is `PyMuPDFLoader`'s built-in behavior — worth noting explicitly since it explains why 9 PDF files produced 120 loaded documents (roughly 13 pages/file average) before chunking even began, which is a feature, not a bug: page-level granularity gives the chunker cleaner, more contextually-bounded input than one giant blob per file | Concatenate all pages into one Document per file before chunking | None — page-level documents are the more useful default for later retrieval (Milestone 4), preserving natural page-boundary context |

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

| Added `code_quality_patterns.md` and `common_bug_patterns.md` to the knowledge base | Closes a gap identified during mentor review — the original three documents only covered *security* practices, not general code-quality patterns or non-security bug patterns that the Code Analysis Agent's findings reference | Leave the knowledge base security-only and treat code-quality knowledge as out of scope entirely | None — these are a natural complement to the Code Analysis Agent's detection rules (e.g., a "Long Method" finding can eventually cite the matching knowledge-base explanation once Milestone 4's retriever exists) |

---

## Milestone 2 — Code Analysis Agent

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| New code lives in `backend/app/agents/code_analysis/` — the exact folder reserved since Milestone 1 | Proves the Open/Closed Principle in practice, not just on paper | Restructure folders to fit new needs | None — this is the entire point of reserving the folder early |
| `/api/analyze` reuses `detect_language()` and `validate_syntax()` from Milestone 1's `services/` completely unchanged | Avoids duplicating language-detection/validation logic; single source of truth | Re-implement detection logic inside the agent | None — this is exactly the reuse the layered architecture was designed to enable |
| `radon` for Python cyclomatic complexity | Mentor-specified tool; well-tested McCabe complexity implementation | Hand-roll complexity counting for Python too | None meaningful — radon is purpose-built for this |
| Custom McCabe complexity calculator (built on `javalang`) for Java, instead of `JavaParser` | `JavaParser` is JVM-based, requiring a Java runtime + subprocess/py4j bridge inside a Python backend — heavier than justified for complexity counting alone. `javalang` was already a project dependency from Milestone 1's syntax validator | `JavaParser` (mentor's listed tool) | Slightly less rich AST metadata than JavaParser provides; both languages score complexity via the identical McCabe formula regardless |
| One flat `Finding` model shared across code smells, complexity, design issues, and best practices (distinguished by a `category` field) rather than four separate finding types | Simpler for the frontend to render (one list, filterable by category/severity) and simpler for the Security Vulnerability Agent (Milestone 2, next) to extend the same shape | Separate Pydantic models per category | Slightly less type-specific validation per category; acceptable since all findings share the same core shape (rule, message, severity, location) |
| Centralized severity thresholds in `severity.py`, separate from detection logic | Severity is a policy decision, not a detection mechanism — keeping it in one file means both Python and Java analyzers score identically and thresholds can be tuned without touching detection code | Inline thresholds inside each analyzer | None — pure win for consistency and maintainability |
| Analysis is skipped entirely when syntax is invalid | No meaningful complexity/design analysis is possible on code that doesn't parse — mirrors how real compilers and linters require a valid parse tree first | Attempt partial/best-effort analysis on invalid syntax | None — this is standard practice, not a limitation |
| Java method line-count is approximated via token position min/max (javalang has no `end_line` attribute) | javalang's AST doesn't track statement end-lines directly; approximating via the span of all descendant token positions is a reasonable substitute | Use a different Java parser with end-line support (e.g. `JavaParser`) | Line counts for Java methods are approximate, not exact — acceptable for a "long method" *smell* threshold, which is inherently a fuzzy signal, not a precise measurement | 

---

## Milestone 2 — Security Vulnerability Agent

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| AST-based pattern matching (`ast` for Python, `javalang` for Java), not an LLM call | Deterministic, fast, free, and directly satisfies the mentor's written spec ("scans submitted code for OWASP-standard vulnerabilities... classifies by type and severity"). No LLM was specified as required for this agent | Use an LLM to detect vulnerabilities via prompting | An LLM could catch more nuanced/novel patterns, but introduces cost, latency, and non-determinism not justified for a rule-based OWASP scan; documented as a scope decision, not an oversight |
| Fixed severity per rule (not threshold-scaled like the Code Analysis Agent) | Security vulnerabilities don't have a meaningful "magnitude" the way code smells do — using `eval()` is critical the moment it exists, not "more critical" the more it's used | Threshold-based severity, mirroring Code Analysis Agent | None — this is a deliberate, correct difference between the two agents' domains, documented explicitly so it doesn't read as an inconsistency |
| Separate `security_schema.py`, not reusing Code Analysis's `Finding` model | Security findings need fields Code Analysis doesn't (`owasp_category`, `code_snippet` for location-specific flagging); forcing a shared schema would create unnecessary coupling between two independently-evolving agents | Extend the existing `Finding` model with optional fields | Led directly to a real integration bug in the Orchestrator (see below) — accepted because each agent's schema staying correct for ITS OWN needs was judged more valuable than avoiding that follow-on integration cost |
| Heuristic detection for `exec()` calls (Java), not qualifier-verified `Runtime.getRuntime().exec()` | `javalang` splits chained method calls (`Runtime.getRuntime().exec(...)`) into separate AST nodes — the `exec()` node's own `qualifier` is `None`, since it's chained off a previous call's result, not a plain qualified name. Reliably confirming the receiver is a `Runtime` instance isn't possible from that node alone | Attempt deeper call-chain resolution to confirm the receiver type | Possible false positives on unrelated `exec()`-named methods from other classes — an accepted trade-off matching how real static analyzers (Bandit, SpotBugs) also favor heuristic pattern matching over full type resolution |
| No cross-statement data-flow tracking for SQL injection detection | Detecting `query = "..." + username` on one line, then `cursor.execute(query)` on the next, requires tracking a variable's origin across statements — a data-flow analysis problem, substantially larger than AST pattern matching | Build a minimal taint-tracking pass | Misses the "build string, then pass variable" pattern — documented as a known scope boundary shared with lightweight scanners like Bandit, not a hidden gap |

---

## Milestone 2 — Multi-Agent Orchestration

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| `asyncio.gather` + `run_in_executor` (thread pool) for concurrent agent dispatch | Both agents are pure CPU-bound synchronous functions with no I/O to `await` — submitting them to a thread pool lets them run concurrently while keeping the event loop free for other requests. Total request time becomes bounded by the slower agent, not their sum | Call both agents sequentially | None significant at current code-submission sizes; documented `ProcessPoolExecutor` as the next scaling step if agents become CPU-heavier, since the GIL limits true parallelism with threads |
| `app/orchestrator/` as a sibling to `app/agents/`, not nested inside it | The Orchestrator doesn't analyze code — it coordinates agents that do. Placing it alongside (not inside) `agents/` reflects that architectural distinction directly in the folder structure | Nest under `agents/orchestrator/` | None — this is purely about accurate naming/structure, no functional difference |
| Explicit schema normalization inside the merge function, rather than forcing both agents to share one schema | Discovered mid-build: Code Analysis's `Finding` (`rule`/`message`, plain-string severity) and Security's `VulnerabilityFinding` (`title`/`description`, `Severity` Enum) have genuinely different shapes, since each was designed independently for its own needs. Forcing a shared schema after the fact would mean editing already-tested, working code purely for the Orchestrator's convenience | Retroactively unify both agents' schemas | None — normalizing at the integration boundary (where heterogeneity is expected and appropriate) is the correct place for this logic, not a workaround |
| Duplicate detection by `(title, line)` equality only | The two agents currently cover entirely distinct concerns (design/quality vs. OWASP vulnerabilities), so true duplicates are rare today. A simple equality check is correct and testable now | Semantic/fuzzy duplicate detection | Won't catch duplicates with slightly different titles — acceptable given current agent scope; documented as an extension point for when future agents (Remediation, PR Summary) might introduce more rule overlap |
| No conflict-resolution policy implemented (documented as a no-op extension point) | No scenario exists yet where two agents flag the identical `(title, line)` with different severities, since severity is decided independently per agent | Build speculative conflict-resolution logic now | None — implementing a resolution policy for a case that cannot currently occur would be premature (YAGNI), but the function signature and comments make clear where it would go |

---

## Milestone 2 — Findings Display & Severity Scoring Module

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| Consolidated "Submit for Analysis" + "Run Security Scan" into a single "Run Full Review" button, calling `/api/review` | Once the Orchestrator merged both agents server-side, exposing them as two separate user-facing actions no longer matched the backend's actual architecture — the UI should mirror the system it represents | Keep both buttons, add a third "Full Review" option | None — the standalone `/api/submit` and `/api/security-scan` endpoints and their tests remain fully intact; only the primary UI flow changed |
| Severity summary cards double as clickable filters, instead of a separate filter dropdown | Keeps the severity count display and the filtering mechanism as one interactive element — clicking "2 Critical" to see just those findings is more direct than reading a count, then finding a separate control for the same value | Separate dropdown/checkbox filter UI | None significant — slightly less conventional than a dedicated filter panel, but more discoverable |
| Client-side filtering and sorting, not additional backend calls | The full findings list for one review is small and already fully loaded in memory; filtering/sorting it is a pure "how do I want to view data I already have" concern with no need for a network round-trip | Re-call `/api/review` with filter/sort query parameters | None — would only matter at a finding-list scale far beyond what a single code review produces |
| `react-simple-code-editor` + `prismjs` for syntax highlighting, not Monaco/CodeMirror | ~2KB combined vs. Monaco's ~5MB; proportionate to "add real syntax highlighting" without the complexity of a full IDE editor component, consistent with the dependency-discipline established since Milestone 1 | Monaco Editor, CodeMirror | Real bug encountered and fixed: `react-simple-code-editor` is an older CommonJS module; Vite's pre-bundling shim exported the whole raw CJS exports object as `default` rather than unwrapping to the actual component, causing a blank page (`Element type is invalid`). Fixed with a defensive `module.default \|\| module` unwrap, verified via headless-browser testing (Playwright) before resubmitting — a real interop cost of choosing a lighter, older-style package |
| Custom CSS-variable-based syntax color tokens, not an imported Prism theme file | Prism's official theme files hardcode one fixed palette; our tokens swap automatically with the existing dark/light `ThemeContext` toggle, keeping syntax highlighting consistent with the rest of the UI's theming system | Import a prebuilt Prism theme (e.g., `prism-tomorrow.css`) | Slightly more upfront CSS to maintain, in exchange for correct dark/light adaptation out of the box |
| Full-width results section below a centered editor, not a persistent two-column layout | The original side-by-side layout wasted space — the editor is naturally compact, while a real findings list (severity cards, filters, multiple detailed findings with code snippets) needs more horizontal room to be readable. The results section also now only renders after a review has actually run, instead of showing an empty placeholder box pre-emptively | Keep the two-column grid permanently | None — pure improvement once the findings list itself is content-heavy |

Not yet acted on — captured now so nothing is forgotten later.

- [ ] Replace all `localhost` defaults with environment-variable-driven URLs (`BACKEND_CORS_ORIGINS`, `VITE_API_BASE_URL`) — already architected for this, just needs real values set at deploy time
- [ ] Decide: bake `chroma_store/` into a container image at build time, vs. mount it on a persistent volume/disk
- [ ] Confirm the hosting platform allows outbound internet access during build (needed once, to download the `sentence-transformers` embedding model) — or pre-download the model into the deployment image
- [ ] Re-run `build_kb.py` as a controlled build/CI step, not something users trigger — it should never run inside a live request
- [ ] If using a platform with ephemeral storage (common on free tiers), confirm `chroma_store/` survives restarts — test this explicitly before assuming it does
- [ ] Set production-appropriate CORS origins (not `*`, and not the dev `localhost:5173`)
- [ ] Review whether the 1MB file upload limit and other Milestone-1-era constants still make sense at production scale

---

## Milestone 2 — External Tool Integration (Bandit, Semgrep, Pylint, Flake8)

**Context:** During mentor review, feedback was given that our hand-written detection rules (in `python_analyzer.py`/`java_analyzer.py`) only check a small, fixed, "preset" list of patterns — anything outside that list is invisible to the agent. This section documents the fix: integrating the actual established tools originally specified in the project's tooling list (Bandit, Semgrep, Pylint, Flake8), run alongside our own custom rules rather than replacing them.

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| Run external tools **alongside** our custom AST rules, not as a replacement | Our custom rules are already tested and working; discarding them would lose that verified coverage for no benefit. External tools broaden coverage, they don't invalidate what's already correct | Fully replace custom rules with external tool output | Slight redundancy when both a custom rule and an external tool flag the same underlying issue (e.g., our `INSECURE_DESERIALIZATION` rule and Bandit's `B301` both catch `pickle.loads()`) — accepted, since each carries a different tool's perspective/CWE mapping, which is informative rather than noisy |
| Installed via `pipx`, NOT added to `backend/requirements.txt` | **Tested and confirmed**: installing `semgrep` directly into the backend's venv broke FastAPI. Semgrep's dependency chain silently upgraded `starlette` to `1.3.1` (incompatible with FastAPI's required `<0.42.0`), causing `TypeError: Router.__init__() got an unexpected keyword argument 'on_startup'`. The corruption was subtle: `pip show starlette` still reported the old, correct version (`0.41.3`) even though the actual imported runtime code was the broken `1.3.1` — confirmed only by checking `starlette.__version__` at import time, not by trusting pip's metadata | Accept the conflict and pin around it within the same venv | None significant — `pipx` isolation is the standard solution for exactly this class of problem, and these tools are only ever invoked as subprocess commands, never imported as Python libraries, so full separation costs nothing functionally |
| Semgrep run with `--config=auto` (registry-based rule fetch) | Pulls Semgrep's community-maintained rule packs automatically for the detected language — hundreds of rules we did not hand-write, which is the entire point of adding Semgrep | Bundle a small custom local rule YAML file (fully offline) | Requires internet access on each run to fetch/refresh registry rules — the same category of accepted trade-off already documented for `sentence-transformers` downloading model weights. A local-only ruleset would avoid the network dependency but would just be a second hand-picked list, defeating the actual goal (comprehensive, tool-maintained coverage, not another narrow preset) |
| Semgrep's `"lines"` field checked for the literal string `"requires login"` before use as a code snippet | **Discovered via real-machine testing** (not documentation): Semgrep's free/OSS CLI redacts the actual matched code line unless the user is logged into a Semgrep account — it returns the literal placeholder string `"requires login"` in that field. Without this check, that placeholder would have displayed in the UI as if it were genuine source code — a misleading result, not just a missing one | Ignore the redaction and display it as-is | None — this is a pure bug fix once discovered; no reason to display a login prompt string as if it were code |
| Semgrep's `owasp` metadata tag picked by preferring the "2021" edition when multiple are present | Real captured output showed Semgrep returning THREE OWASP edition tags simultaneously per finding (2017, 2021, AND 2025). Showing all three is noisy and inconsistent with our own custom rules, which are all written against the 2021 edition | Display all tags, or pick the first one arbitrarily | None — preferring 2021 for consistency is a simple, correct choice; the helper function is isolated so this preference is a one-line change if OWASP's own numbering conventions shift again |
| Pylint run with `--disable=missing-module-docstring,missing-function-docstring,missing-class-docstring` | **Discovered via testing**: Pylint's default strictness flags "Missing docstring" on nearly all code regardless of actual quality, making a "clean code = zero findings" test impossible to satisfy for even trivial functions, and burying genuinely important findings (unused variables, likely bugs) under pure documentation nagging that doesn't serve a security/quality review tool's purpose | Leave Pylint at full default strictness | None — every other Pylint check (including real bugs, not just style) remains fully active; this is a disclosed, deliberate tuning decision, not hiding unfavorable results |
| No Java equivalent for Pylint/Flake8 (e.g., PMD, Checkstyle) in this pass | Both are JVM-based CLI tools requiring a JDK — a dependency Milestone 1 deliberately avoided by choosing `javalang` (pure Python, no JDK) for Java parsing | Install a JDK and integrate PMD/Checkstyle now | Documented as a known, explicit follow-up rather than silently left out — see Known Follow-ups below |

---

## Milestone 3 — Frontend Remediation Agent Integration

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| Split findings display into standalone stateful `FindingItem.jsx` components | Allows each finding to maintain its own independent loading, success, and error states when querying LLM remediation. Otherwise, clicking "Get Fix" on one finding would flicker loading states across the entire findings list | Manage state globally in `FindingsDashboard.jsx` or `App.jsx` | Slightly more React files/component boundary overhead; heavily paid off in clean UX and codebase modularity |
| Explicitly map finding categories to the 4 recommendation types requested in mentor slides (Security, Code Quality, Performance, Maintainability) | Satisfies the mentor's slide specifications (Slide 2) directly, displaying clear color-coded badges to improve diagnostic clarity for developers | Keep the raw backend categories as-is | Requires client-side mapping overhead, which is fast and lightweight |
| Promise-wrapped `FileReader` helper in `App.jsx` to load file contents into a frozen `submittedCode` snapshot state | Guarantees that the full submitted code is available for both line-range extraction fallback and downstream RAG chat context, even when in file upload mode. Snapshotting ensures line numbers don't mismatch if user edits the code editor after scanning | Let components scrape the editor DOM or call backend endpoints repeatedly to re-read files | Reading the file on the client is fast, asynchronous, and preserves clean data flow |
| PrismJS for read-only syntax highlighting in the Suggested Fix box using `dangerouslySetInnerHTML` | Renders beautifully highlighted code snippets matching the main editor theme, keeping standard Prism token styling active for dark/light modes without loading a heavy editor component | Embed an editable react-simple-code-editor or show plain text | Raw pre block has no highlighting (poor developer readability); editable editor is unnecessary overhead for a read-only suggestion |

---

## Milestone 3 — Conversational Code Assistant (RAG Chatbot) Integration

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| Initialize the `Chroma` database client once during application startup lifespan and cache it as `app.state.vector_store` | Keeps a single persistent SQLite database connection open (Singleton pattern). This completely eliminates file lock contention errors on Windows during concurrent requests, and removes the query-time latency of opening database files on every message | Instantiating the Chroma client locally inside the `/api/chat` route on every incoming POST call | Deferring database connection verification until startup completes. We fail-fast on server initialization if indices are missing or corrupted, which is safer for deployment |
| Defer embedding imports (`HuggingFaceEmbeddings`, `Chroma`, `chromadb`) inside the `lifespan` manager block rather than importing at the file level | Keeps importing `main.py` fast and lightweight. When running automated testing tools (like pytest discovery) that don't spin up the server, this prevents the test client from wasting 2 seconds initializing massive machine learning weights | Declare imports at the top level of `main.py` | Imports are localized to lifespan startup scope, meaning route files must fetch variables from `request.app.state` rather than importing them directly |
| Configure Groq API calls with a low temperature of `0.3` | Restricts the LLM (Llama-3.3) to stay highly focused and grounded on the retrieved OWASP Cheat Sheet documents, significantly reducing the chance of hallucinated secure coding recommendations | Use a higher temperature (like `0.7` to `1.0`) to make replies feel more natural or conversational | Conversations are slightly more technical and repetitive in phrasing, which is highly preferred for security audits |
| Deduplicate and parse citations client-side to render as clean metadata cards rather than embedding raw footnotes in the AI's reply text | Separates presentation from data. This gives the frontend layout complete styling freedom (such as displaying hover tooltips or footnotes) and prevents citation text from corrupting code formatting blocks in the markdown reply | Let the AI write footnotes directly at the bottom of its text | None — a minor client-side filtering loop overhead which finishes in less than a millisecond |

---

## Milestone 3 — Code Health Score Integration

| Decision | Reason | Alternative Considered | Trade-off Accepted |
|---|---|---|---|
| Deduct points from a baseline of 100 based on severity weightings (critical: 25, high: 15, medium: 5, low: 2) | Establishes a clear security-focused health gauge. Severe vulnerabilities (like command injections) penalize the score heavily to reflect high threat vectors, while style smells carry small penalties | An additive scoring system or simple count ratio | Does not reflect complex code health; a file with 10 minor smells would look "worse" than a file with 1 critical RCE, which is false from a security standpoint |
| Capping the score at a lower bound of `0` | Prevent negative score ratings which would violate mathematical constraints and break UI formatting | Allow negative scores | Capping makes scores predictable and keeps it clean for API integrations |
| Custom SVG path drawing and CSS transition animations inside `FindingsDashboard.jsx` | Delivers a premium, animated progress circle when page results mount. Runs with native hardware acceleration and zero external charting library dependencies | Embed Recharts or Chart.js | Requires writing basic trigonometry formulas inside the React components, but saves 150KB of package payload |

---

## Known Follow-ups for Future Milestones

- ~~Replace/supplement the seed markdown documents in `knowledge-base/documents/` with real OWASP Cheat Sheet PDFs before final submission.~~ **Done** — 9 official OWASP Cheat Sheet PDFs added; knowledge base now at 306 chunks (see Secure Coding Knowledge Base section above).
- `langchain-community` is in maintenance/sunset mode upstream — consider migrating to standalone integration packages if this project continues past the internship.
- Re-evaluate embedding model choice (`all-MiniLM-L6-v2` vs. a larger model) once Milestone 4's retriever is built and retrieval quality can be measured empirically.
- SQL injection detection has no cross-statement data-flow tracking (see Security Vulnerability Agent section above) — revisit if false negatives on this pattern become a practical problem.
- Java `exec()` detection is a heuristic without receiver-type verification (see Security Vulnerability Agent section above) — revisit if false positives become a practical problem.
- Orchestrator conflict-resolution policy is currently a documented no-op — implement if/when a future agent's rules genuinely overlap with an existing one at the same `(title, line)`.
- Consider `ProcessPoolExecutor` instead of the default thread pool for agent dispatch if agent analysis becomes significantly more CPU-heavy at scale (sidesteps Python's GIL entirely).
- PMD and Checkstyle (Java code quality tools) were not integrated in this pass — both require a JDK, a dependency deliberately avoided since Milestone 1. Revisit if Java code-quality coverage needs to match Python's (Pylint + Flake8) depth.
- SpotBugs/FindSecBugs (Java security tools) were not integrated — both require compiled bytecode, not source text, meaning submitted Java snippets would need to be compiled first (a substantial engineering problem on its own: missing imports, incomplete classes, etc.). Documented as a known, deliberate scope boundary, not an oversight.
- SonarQube was not integrated — it is a hosted server application, not a library/CLI tool, requiring different infrastructure (continuous hosting) than anything else in this project.
