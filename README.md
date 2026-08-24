# Secoria

**AI Code Review & Security Analysis Agent**  
*Infosys Springboard Internship Project*

Secoria is an intelligent, multi-agent platform that automatically analyzes source code for quality issues, cognitive/cyclomatic complexity, and OWASP Top 10 security vulnerabilities — reducing manual code review effort, accelerating secure development, and providing 1-click AI auto-remediation.

> **Project Status:** ✅ **Milestone 4 Complete — Final Delivery (59/59 Automated Tests Passing)**

---

## 📑 Table of Contents

- [Project Vision & Agent Pipeline](#project-vision--agent-pipeline)
- [Milestone Progress](#milestone-progress)
- [System Architecture](#system-architecture)
- [Folder Structure](#folder-structure)
- [Tech Stack & Dependencies](#tech-stack--dependencies)
- [Installation & Quickstart](#installation--quickstart)
- [API Endpoints Reference](#api-endpoints-reference)
- [Key Features](#key-features)
- [Demonstration Test Suite](#demonstration-test-suite)
- [License](#license)

---

## 🎯 Project Vision & Agent Pipeline

Software engineering teams struggle with inconsistent code quality, undetected security vulnerabilities, and slow manual code reviews. Secoria addresses this with a concurrent multi-agent AI pipeline:

| Agent / Module | Responsibility | Status |
|---|---|:---:|
| **Code Submission & Validation** | Language detection & AST-based syntax validation for Python & Java | ✅ Complete |
| **Code Analysis Agent** | Detects code smells, cyclomatic/cognitive complexity (`radon`), and God Objects | ✅ Complete |
| **Security Vulnerability Agent** | Scans for OWASP Top 10 vulnerabilities (SQLi, Command Injection, Insecure Deserialization, Hardcoded Secrets, Weak Crypto) | ✅ Complete |
| **Multi-Agent Orchestrator** | Concurrent dispatch (`asyncio.gather`), deduplication, ranking, and **Code Health Score (0–100)** | ✅ Complete |
| **Remediation Agent** | Groq LLM-driven fix recommendations & **1-Click Auto-Remediation** with side-by-side code diffs | ✅ Complete |
| **Conversational Code Assistant** | RAG-powered Q&A grounded in an offline **ChromaDB** vector store with page citations | ✅ Complete |
| **PR Summary Agent** | Generates markdown Pull Request review comments with severity matrices & action plans | ✅ Complete |
| **PDF Report Generation** | Server-side binary PDF report compilation with health score badges & roadmaps | ✅ Complete |

---

## 🏆 Milestone Progress

- [x] **Milestone 1 — Foundations** ✅
  - Clean layered architecture designed (`api/`, `services/`, `models/`, `agents/`, `core/`).
  - Code Submission Module (paste/upload Python & Java, heuristics, AST syntax validation).
  - Secure Coding Knowledge Base — 306 chunks indexed in ChromaDB (10 OWASP PDFs + 5 markdown reference sheets).
- [x] **Milestone 2 — Multi-Agent Orchestration & Static Analysis Pipeline** ✅
  - Code Analysis Agent (code smells, McCabe complexity, deep nesting, God Object detection).
  - Security Vulnerability Agent (OWASP Top 10 rules with line-specific code snippets).
  - Multi-Agent Orchestrator (`asyncio.gather` concurrent dispatch, deduplication, severity sorting via `/api/review`).
  - External tool integration (Bandit, Semgrep, Pylint, Flake8) running in isolated `pipx` environments.
- [x] **Milestone 3 — Agent Report Generation, Chat & Remediation** ✅
  - Remediation Agent (Groq LLM + deterministic regex/AST fallback guarantee).
  - Code Health Score mathematical formula (100 baseline minus weighted severity deductions).
  - Conversational Code Assistant (RAG Chatbot grounded in ChromaDB vector store).
  - PR Summary Agent (structured PR markdown review comments).
- [x] **Milestone 4 — Final Delivery & Advanced Developer Tools** ✅
  - **1-Click Full-Code Auto-Remediation** with interactive side-by-side **Code Comparator Diff Modal**.
  - Server-side **ReportLab PDF review report export** (`POST /api/report/pdf`).
  - **Visual Analytics Dashboard** (severity distribution, issue breakdown charts).
  - **59/59 automated backend unit & integration tests passing**.

---

## 🏗️ System Architecture

Secoria is built as a **monorepo** with a clean layered FastAPI backend and a modern React + Vite frontend:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           React + Vite Frontend                             │
│  (Custom Code Editor, Health Score Gauge, Interactive Finding Cards,        │
│   Code Comparator Diff Modal, RAG Chat Sidebar, PDF/PR Export Controls)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP POST (JSON / Multipart)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FastAPI Layered Backend (Clean Arch)                   │
│                                                                             │
│  [API Routers] (submission, analysis, security, orchestration, chat, etc.)  │
│  [Services]    (Shared: language_detector.py, syntax_validator.py)          │
│                                                                             │
│                                      │                                      │
│                                      ▼                                      │
│                         ┌──────────────────────────┐                        │
│                         │ Multi-Agent Orchestrator │                        │
│                         │  (asyncio.gather + pool) │                        │
│                         └────────────┬─────────────┘                        │
│                                      │                                      │
│                     ┌────────────────┴────────────────┐                     │
│                     ▼                                 ▼                     │
│       ┌───────────────────────────┐     ┌───────────────────────────┐       │
│       │    Code Analysis Agent    │     │ Security Vulnerability Agt│       │
│       │  - Radon (Cyclomatic CC)  │     │  - AST OWASP Top 10 rules │       │
│       │  - Javalang (Java AST)    │     │  - Bandit, Semgrep (pipx) │       │
│       │  - Smells & Deep Nesting  │     │  - SQLi, CmdInj, Secrets  │       │
│       └─────────────┬─────────────┘     └─────────────┬─────────────┘       │
│                     └────────────────┬────────────────┘                     │
│                                      ▼                                      │
│                         [Deduplicate & Health Score]                        │
│                                      │                                      │
│          ┌───────────────────────────┼───────────────────────────┐          │
│          ▼                           ▼                           ▼          │
│  ┌───────────────┐           ┌───────────────┐           ┌───────────────┐  │
│  │ Remediation   │           │ RAG Chat      │           │ PR & PDF      │  │
│  │ Agent (Groq   │           │ Assistant     │           │ Report Engine │  │
│  │ Llama 3.3/Qwen│           │ (LangChain +  │           │ (ReportLab    │  │
│  │ + AST fallback│           │ ChromaDB k=3) │           │ Server-side)  │  │
│  └───────────────┘           └───────┬───────┘           └───────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       ▼
                        ┌─────────────────────────────┐
                        │ ChromaDB Vector Store       │
                        │ 306 Chunks / all-MiniLM-L6  │
                        │ (10 OWASP PDFs + 5 MD docs) │
                        └─────────────────────────────┘
```

---

## 📁 Folder Structure

```
secoria/
├── backend/                    FastAPI Backend Application
│   ├── app/
│   │   ├── api/                Route handlers (submission, analysis, security, orchestration, remediation, chat, pr_summary, report)
│   │   ├── core/               Config, logging, and LLM Key Manager with failover
│   │   ├── models/             Pydantic request & response schemas
│   │   ├── services/           Shared business logic (language detection & syntax validation)
│   │   ├── agents/
│   │   │   ├── code_analysis/  Code smells, cyclomatic complexity, God Object detection
│   │   │   ├── security/       OWASP Top 10 vulnerability scanner & external CLI wrappers
│   │   │   └── remediation/    LLM fix generator & 1-click auto-remediation engine
│   │   └── orchestrator/       Concurrent dispatcher, deduplication, and health scoring
│   ├── tests/                  59 automated unit & integration tests
│   └── requirements.txt
├── frontend/                   React + Vite + Tailwind UI Dashboard
│   └── src/
│       ├── components/         CodeEditor, FindingsDashboard, CodeComparatorModal, ChatSidebar, VisualAnalytics, LandingPage
│       ├── context/            ThemeContext (Dark / Light mode)
│       └── services/           api.js client
├── knowledge-base/             Offline Vector Ingestion Pipeline
│   ├── documents/              10 official OWASP PDFs + 5 secure coding Markdown sheets
│   ├── scripts/                loader.py → chunker.py → embedder.py → build_kb.py
│   └── chroma_store/           Persisted vector database (306 chunks)
├── docs/                       Architecture decision logs, presentation guides, sample suites
├── LICENSE
└── README.md
```

---

## 💻 Tech Stack & Dependencies

### Backend
- **FastAPI & Uvicorn**: High-performance asynchronous REST API framework.
- **Pydantic**: Type-safe request/response schema validation and data contracts.
- **Radon & AST**: Python cyclomatic complexity and abstract syntax tree parser.
- **Javalang**: Pure-Python Java 8 AST parser (no JDK required).
- **ReportLab**: Server-side professional PDF generation.
- **OpenAI Client & Groq**: High-throughput GenAI inference (Llama 3.3 / Qwen / GPT-OSS models).

### Frontend
- **React & Vite**: Fast component architecture and modern HMR.
- **Tailwind CSS v4**: Utility-first responsive styling with dark/light themes.
- **Prism.js & Simple Code Editor**: Syntax tokenization and line-numbered editor overlay.

### Knowledge Base & RAG
- **ChromaDB**: Local file-based vector database.
- **Sentence-Transformers (`all-MiniLM-L6-v2`)**: Fast, 0-cost local dense vector embeddings.
- **PyMuPDF**: Document loader for PDF extraction.
- **LangChain**: Text chunking (`RecursiveCharacterTextSplitter`).

---

## ⚙️ Installation & Quickstart

### Prerequisites
- **Python 3.12+**
- **Node.js 18+** & npm

### 1. Configure Environment Variables
In `backend/.env` (copy from `backend/.env.example`):
```env
LOG_LEVEL=INFO
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.6-27b
```

### 2. Start the Backend
```powershell
cd backend
python -m venv venv

# If PowerShell restricts script execution, run:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Start the Frontend
```powershell
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173/`** in your browser.

### 4. Run Automated Backend Tests (59 Tests)
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest
```

---

## 🔌 API Endpoints Reference

Interactive OpenAPI documentation is available at `http://localhost:8000/docs`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health and status check |
| `POST` | `/api/submit` | Validates syntax and detects programming language |
| `POST` | `/api/analyze` | Code Analysis Agent (complexity and code smells) |
| `POST` | `/api/security-scan` | Security Vulnerability Agent (OWASP scan) |
| `POST` | `/api/review` | **Full Multi-Agent Orchestrated Review** (Health score, merged findings) |
| `POST` | `/api/remediate` | Generates AI fix snippet and explanation for a single finding |
| `POST` | `/api/remediate-all` | **1-Click Auto-Remediation** producing refactored source code and changelog |
| `POST` | `/api/chat` | RAG Conversational Assistant with ChromaDB source citations |
| `POST` | `/api/pr-summary` | Compiles review into markdown Pull Request comments |
| `POST` | `/api/report/pdf` | Exports complete code review report as a downloadable PDF |

---

## 🧪 Demonstration Test Suite

Three pre-configured demonstration tiers are included in the UI sample selector and `docs/demo_samples/`:

1. **Tier 1: Clean & Secure Code (`01_clean_code.py`)**
   - *Characteristics:* Parameterized database queries, low complexity, clean modular design.
   - *Expected Outcome:* **100/100 Health Score, 0 Findings (Clean)**.
2. **Tier 2: Moderate Complexity & Smells (`02_moderate_code_smells.py`)**
   - *Characteristics:* 7 levels of nested control flow, cyclomatic complexity = 12 (> 10 threshold).
   - *Expected Outcome:* **~70/100 Health Score, Deep Nesting & Complexity Smell**.
3. **Tier 3: Critical OWASP Vulnerabilities (`03_critical_vulnerabilities.py`)**
   - *Characteristics:* SQL string concatenation, `os.system()` shell execution, weak MD5 hashing, unpickling raw bytes, hardcoded AWS secrets.
   - *Expected Outcome:* **< 50/100 Health Score (Critical)**. Clicking **"Auto-Remediate Code"** refactors the file, and re-scanning restores the score to **100/100**.

---

## 📄 License

This project is developed under the Infosys Springboard Internship Program and licensed under the [MIT License](LICENSE).
