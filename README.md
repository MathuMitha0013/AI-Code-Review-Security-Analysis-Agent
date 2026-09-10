# Secoria 🛡️

**AI-Powered Code Review & Multi-File Security Analysis Platform**  
*Enterprise Multi-Agent Static Analysis, OWASP Top 10 Vulnerability Detection, 1-Click Auto-Remediation & Executive Audit Reporting for Python & Java*

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-FF6F00?style=for-the-badge&logo=databricks&logoColor=white)](https://trychroma.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-87%20Passing%20(100%25)-brightgreen?style=for-the-badge)](backend/tests/)

Secoria is an intelligent, multi-agent cybersecurity platform that automates source code reviews for quality defects, cyclomatic/cognitive complexity, and OWASP Top 10 security vulnerabilities. It combines abstract syntax tree (AST) static analysis with multi-tier Large Language Model (LLM) agents and an offline Retrieval-Augmented Generation (RAG) vector database to deliver instant code audits, 1-click refactoring diffs, interactive multi-file project analysis, executive PDF reports with SLA resolution matrices, and automated GitHub Pull Request reviews.

---

## 📑 Table of Contents

- [Key Capabilities](#-key-capabilities)
- [Multi-Agent Architecture](#-multi-agent-architecture)
- [Interactive Features & Components](#-interactive-features--components)
  - [1. Single-File Code Review & Health Score](#1-single-file-code-review--health-score)
  - [2. Multi-File ZIP Project Scanner & Repository Explorer](#2-multi-file-zip-project-scanner--repository-explorer)
  - [3. Multi-Format Report Export Hub (PDF, HTML, JSON, Markdown, CSV)](#3-multi-format-report-export-hub)
  - [4. GitHub Pull Request Review Bot & CI/CD Gating](#4-github-pull-request-review-bot--cicd-gating)
  - [5. 1-Click Auto-Remediation & Diff Comparator](#5-1-click-auto-remediation--diff-comparator)
  - [6. RAG Conversational Security Assistant with Markdown Engine](#6-rag-conversational-security-assistant)
- [System Architecture Diagram](#-system-architecture-diagram)
- [Repository Structure](#-repository-structure)
- [Tech Stack](#-tech-stack)
- [Installation & Quickstart](#-installation--quickstart)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Multi-Provider LLM Resilience](#-multi-provider-llm-resilience)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [License](#-license)

---

## 🚀 Key Capabilities

- 🔍 **Polyglot Static & Semantic Analysis**: Full AST-level parsing and complexity checks for **Python** (`ast`, `radon`) and **Java 8+** (`javalang`).
- 🛡️ **OWASP Top 10 & CWE Detection**: Identifies SQL Injections (CWE-89), Command Injections (CWE-78), Insecure Deserialization (CWE-502), Hardcoded Credentials (CWE-798), Weak Cryptography (CWE-327), Path Traversals (CWE-22), and XSS (CWE-79).
- 📦 **Full-Project Multi-File ZIP Scanner**: Safely extracts, indexes, and conducts batch multi-agent scans across entire Python & Java codebases with Zip-Slip protection, project-wide metrics, and a tree-based file explorer.
- 📥 **Multi-Format Report Export Hub**: 5 export formats including executive 2-pass ReportLab PDF reports (with SLA resolution matrix & dynamic `Page X of Y` footers), standalone dark-mode HTML, DevSecOps JSON, Markdown, and CSV tabular spreadsheets.
- 🤖 **GitHub PR Review Bot**: Parses unified git diffs directly from GitHub Pull Request URLs, generating line-by-line review comments and CI/CD merge gate verdicts.
- ⚡ **1-Click AI Auto-Remediation**: Instant generation of AST-validated secure code with an interactive side-by-side visual diff modal.
- 📚 **ChromaDB RAG Assistant**: Embedded offline knowledge base indexed with 306 OWASP Top 10 & security cheat-sheet chunks with exact page citations and syntax-highlighted Markdown responses.
- 🔄 **Multi-Tier LLM Key Failover**: Resilient multi-provider routing across Google Gemini, Groq (Llama 3.3 / Qwen), local offline Ollama instances, and deterministic AST fallbacks.

---

## 🧠 Multi-Agent Architecture

Secoria orchestrates specialized agents concurrently via asynchronous dispatch (`asyncio.gather`), combining deterministic rule-based precision with GenAI reasoning:

```
                      ┌────────────────────────────────────────┐
                      │          Source Code Submission        │
                      │       (Paste / Single File / ZIP)      │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Syntax & Language Detection Gate    │
                      │      (Python ast / Java javalang)      │
                      └───────────────────┬────────────────────┘
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
      ┌─────────────────────────────┐           ┌─────────────────────────────┐
      │     Code Analysis Agent     │           │  Security Vulnerability Agt │
      │  • Cyclomatic Complexity CC │           │  • OWASP Top 10 / CWE Rules │
      │  • Cognitive Nesting (>3)   │           │  • AST Injection Matchers   │
      │  • God Classes & Smells     │           │  • Hardcoded Secret Regex   │
      │  • Long Methods / Bad Params│           │  • Weak Cryptography / Hash │
      └──────────────┬──────────────┘           └──────────────┬──────────────┘
                     └────────────────────┬────────────────────┘
                                          ▼
                      ┌────────────────────────────────────────┐
                      │        Multi-Agent Orchestrator        │
                      │  • Deduplicate & Merge Findings        │
                      │  • Compute Code Health Score (0–100)   │
                      │  • Sort by Severity (Critical -> Info) │
                      └───────────────────┬────────────────────┘
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
          ▼                               ▼                               ▼
┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
│ Remediation Agent │           │   RAG Assistant   │           │ Report Export Hub │
│ • 1-Click Fixes   │           │ • ChromaDB Search │           │ • Executive PDF   │
│ • Unified Diffs   │           │ • OWASP Citations │           │ • HTML / JSON     │
│ • AST Validation  │           │ • Markdown Format │           │ • Markdown / CSV  │
└───────────────────┘           └───────────────────┘           └───────────────────┘
```

---

## 💻 Interactive Features & Components

### 1. Single-File Code Review & Health Score
Paste or upload raw Python (`.py`) or Java (`.java`) code. The engine computes a deterministic **Code Health Score** ($0 - 100$) using weighted deductions:
$$\text{Health Score} = \max\left(0, 100 - \sum \text{Severity Deductions}\right)$$
- **Critical**: -25 pts (e.g., Remote Code Execution, SQLi)
- **High**: -15 pts (e.g., Insecure Deserialization, Hardcoded API Keys)
- **Medium**: -8 pts (e.g., Weak Hashing MD5/SHA1, Missing Error Handlers)
- **Low / Info**: -3 pts (e.g., High Cyclomatic Complexity, Deep Nesting)

### 2. Multi-File ZIP Project Scanner & Repository Explorer
Upload an entire repository archive (`.zip`). Secoria features:
- **Zip-Slip Traversal Prevention** & safe in-memory extraction.
- **Polyglot Filtering**: Intelligently scans Python (`.py`) and Java (`.java`) files, including Windows Notepad text variants (`.py.txt`, `.java.txt`).
- **Repository Explorer**: Tree navigation with file-level health badges, total lines of code (LOC), clean modules count, project PDF exports, and 1-click in-context remediation.

### 3. Multi-Format Report Export Hub
Download audit findings in 5 comprehensive formats:
- 📄 **Executive PDF**: Professional 2-pass `ReportLab` document with running `Page X of Y` headers/footers, SLA resolution matrix, code snippets, and a 4-phase remediation roadmap.
- 🌐 **Interactive Standalone HTML**: Client-side generated responsive report with embedded dark-mode styling and printable audit stylesheets.
- ⚙️ **DevSecOps JSON**: Machine-readable payload for CI/CD artifact ingestion.
- 📝 **GitHub Markdown (`.md`)**: Formatted PR checklist tables and severity summaries.
- 📊 **CSV Spreadsheet**: Tabular findings export for Excel / Google Sheets analysis.

### 4. GitHub Pull Request Review Bot & CI/CD Gating
Paste any GitHub PR URL (e.g., `https://github.com/owner/repo/pull/12`) or simulate unified git diffs:
- Automated line-by-line inline security comment recommendations.
- Interactive "How to Use" guide and language compatibility tags (`.py` & `.java`).
- CI/CD merge gating verdicts (`PASSED` or `BLOCKED`).

### 5. 1-Click Auto-Remediation & Diff Comparator
Click **"Auto-Remediate Code"** on any file or finding to generate secure code replacements. Inspect changes side-by-side with syntax-highlighted diffs before applying them directly into the editor with AST validation.

### 6. RAG Conversational Security Assistant
Chat with an offline AI assistant trained on 10 OWASP standard documents and 5 secure coding sheets (306 indexed vector chunks in ChromaDB). Features Markdown code syntax highlighting, 1-click copy buttons, and exact source citations.

---

## 📁 Repository Structure

```
Secoria/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── code_analysis/      # Radon, AST & Java complexity parsers
│   │   │   ├── security/           # OWASP Top 10 & CWE vulnerability engines
│   │   │   └── remediation/        # LLM auto-fix generator & unified diff patcher
│   │   ├── api/                    # REST API route handlers
│   │   │   ├── orchestration.py    # Single file & multi-file ZIP review endpoints
│   │   │   ├── remediation.py      # 1-click auto-remediation routes
│   │   │   ├── chat.py             # RAG ChromaDB conversational assistant
│   │   │   ├── pr_summary.py       # Pull request review summaries
│   │   │   ├── report.py           # ReportLab executive PDF & ZIP PDF generator
│   │   │   └── github_webhook.py   # GitHub PR webhook & diff simulator
│   │   ├── core/                   # Multi-provider LLM failover & config
│   │   ├── models/                 # Pydantic schemas & data models
│   │   ├── orchestrator/           # Async multi-agent dispatcher & health scoring
│   │   └── services/               # Syntax validator, ZIP analyzer, GitHub service
│   ├── scripts/
│   │   └── test_comprehensive_e2e.py # 10-point automated end-to-end integration test
│   ├── tests/                      # 87 automated Pytest test suites (100% passing)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CodeEditor.jsx         # Line-numbered syntax highlighter
│   │   │   ├── FindingsDashboard.jsx  # Categorized finding cards & export buttons
│   │   │   ├── MultiFileExplorer.jsx  # ZIP project explorer & KPI dashboard
│   │   │   ├── ZipUploadModal.jsx     # Modern ZIP upload modal with preset packs
│   │   │   ├── GitHubPRModal.jsx      # GitHub PR review bot modal & guide
│   │   │   ├── ReportExportModal.jsx  # Multi-format report export hub (PDF/HTML/JSON/MD/CSV)
│   │   │   ├── CodeComparatorModal.jsx# Side-by-side visual diff viewer
│   │   │   ├── MarkdownMessage.jsx    # Chat markdown syntax highlighter & copy buttons
│   │   │   ├── ChatSidebar.jsx        # RAG conversational assistant interface
│   │   │   ├── VisualAnalytics.jsx    # Severity & category breakdown charts
│   │   │   └── LandingPage.jsx        # Dark glassmorphic hero & navigation
│   │   ├── services/api.js            # Axios client with centralized error handling
│   │   ├── index.css                  # Custom dark glassmorphism design system
│   │   └── App.jsx                    # Root view controller
│   └── package.json
├── knowledge-base/
│   ├── chroma_store/               # Persisted ChromaDB vector database
│   ├── documents/                  # 10 OWASP standard PDFs & reference sheets
│   └── scripts/                    # Vector ingestion & embedding scripts
├── docs/                           # Architectural logs, sample codes, reports
└── README.md
```

---

## 🛠️ Tech Stack

| Domain | Technology / Library | Role |
|---|---|---|
| **Backend Framework** | FastAPI (Python 3.12+) | High-performance asynchronous REST API |
| **Data Validation** | Pydantic v2 | Strict request/response data contracts |
| **Static Code Analysis** | `ast`, `radon`, `javalang` | AST parsing, cyclomatic complexity & syntax verification |
| **Vector DB & Embeddings** | ChromaDB & `all-MiniLM-L6-v2` | 0-cost local dense vector retrieval (RAG) |
| **LLM Inference** | Google Gemini, Groq, Ollama | Multi-provider fallback chain (Llama 3.3, Qwen 2.5) |
| **Report Generation** | ReportLab | Server-side binary executive PDF generation |
| **Frontend Framework** | React 18 + Vite | Modular UI with Hot Module Replacement |
| **Styling System** | Vanilla CSS + Tailwind CSS | Obsidian dark glassmorphism & responsive layout |
| **Code Highlighting** | Prism.js & Simple Code Editor | In-browser syntax tokenization |

---

## ⚡ Installation & Quickstart

### Prerequisites
- **Python 3.12+**
- **Node.js 18+** & `npm`

### 1. Configure Environment Variables
Copy `backend/.env.example` to `backend/.env`:
```env
LOG_LEVEL=INFO

# 1. Google Gemini (Free API Key from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# 2. Groq Cloud (Free API Key from console.groq.com)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# 3. Local Offline Ollama Fallback (Optional)
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5-coder

# Fallback sequence:
LLM_PROVIDER_ORDER=gemini,groq,ollama
```

### 2. Start Backend Server
```powershell
cd backend
python -m venv venv

# On Windows PowerShell:
.\venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend API starts at **`http://127.0.0.1:8000`** (Interactive Docs: `http://127.0.0.1:8000/docs`).

### 3. Start Frontend Dashboard
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server status and loaded module health |
| `POST` | `/api/submit` | Language detection and syntax validation gate |
| `POST` | `/api/analyze` | Code smells, cyclomatic complexity, and God Object detection |
| `POST` | `/api/security-scan` | Security Vulnerability Agent (OWASP Top 10 scanner) |
| `POST` | `/api/review` | **Full Multi-Agent Review** (Merged findings + Health Score) |
| `POST` | `/api/review-zip` | **Full-Project Multi-File ZIP Review** (Batch multi-agent audit) |
| `POST` | `/api/remediate` | Remediation recommendation & diff for a single finding |
| `POST` | `/api/remediate-all`| **1-Click Full Auto-Remediation** (Refactored code + patch changelog) |
| `POST` | `/api/chat` | RAG Conversational Assistant with ChromaDB citations |
| `POST` | `/api/pr-summary` | Generates developer-friendly PR review Markdown summaries |
| `POST` | `/api/github/simulate-pr-review` | Simulates a full GitHub Pull Request automated review |
| `POST` | `/api/github/webhook` | Receives live GitHub pull_request webhook events |
| `POST` | `/api/report/pdf` | Compiles and downloads an executive PDF audit report |
| `POST` | `/api/report/zip-pdf` | Compiles and downloads a multi-file project repository PDF report |

---

## 🛡️ Multi-Provider LLM Resilience

Secoria implements a multi-tier failover mechanism managed by `LLMManager`:
1. **Tier 1 — Google Gemini API** (`gemini-1.5-flash` / `gemini-2.0-flash`): High rate limits, fast reasoning.
2. **Tier 2 — Groq Cloud** (`llama-3.3-70b-versatile` / `qwen`): Ultra high-speed GenAI inference with multiple API key rotation.
3. **Tier 3 — Local Offline Ollama** (`http://localhost:11434/v1`): Zero external API dependency, fully private code processing.
4. **Tier 4 — Deterministic AST/Regex Engine**: Guarantees working remediation code even in air-gapped environments without any active LLM keys.

---

## 🧪 Testing & Quality Assurance

Secoria includes automated test suites covering unit logic, multi-agent orchestration, ZIP parsing, and live endpoint flows:

```powershell
cd backend
# Run full Pytest test suite (87 tests, 100% passing)
.\venv\Scripts\python.exe -m pytest -v

# Run complete 10-point End-to-End integration verification
.\venv\Scripts\python.exe scripts/test_comprehensive_e2e.py
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
