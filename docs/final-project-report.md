# Secoria — Technical Project Report & Final Demonstration Guide

**Project Title:** Secoria — AI Code Review & Security Analysis Agent  
**Internship Program:** Infosys Springboard Internship  
**Project Status:** Milestone 4 Complete (Final Delivery)  

---

## Executive Summary

**Secoria** is an automated, multi-agent AI platform built to eliminate slow, manual code reviews and prevent security vulnerabilities prior to production deployment. Developed using a layered Python FastAPI backend and a modern React + Vite frontend, Secoria orchestrates specialized static analysis and GenAI agents to analyze Python and Java source code concurrently.

The platform provides:
1. **Code Analysis Agent**: Detects code smells, cyclomatic/cognitive complexity issues, long methods, and anti-patterns.
2. **Security Vulnerability Agent**: Scans for OWASP Top 10 vulnerabilities (SQL Injection, Command Injection, Weak Cryptography, Hardcoded Secrets, Insecure Deserialization).
3. **Multi-Agent Orchestrator**: Concurrent dispatch (`asyncio.gather`), findings deduplication, severity ranking, and overall Code Health Scoring (0–100).
4. **Remediation Agent**: Groq LLM (Llama 3.3 70B) integration producing developer-ready code fixes and diffs.
5. **Conversational Code Assistant**: RAG-powered Q&A grounded in an offline ChromaDB vector database containing 306 chunks from official OWASP Cheat Sheets and reference docs.
6. **Code Review Report Generation Module**: Generates exportable PDF review reports and markdown Pull Request review comments.

---

## 1. System Architecture & Component Design

```
┌─────────────────┐        HTTP (JSON)        ┌───────────────────────────┐
│  React Frontend  │ ────────────────────────► │      FastAPI Backend       │
│ (Vite + Tailwind)│ ◄──────────────────────── │      (Layered/Clean)       │
└─────────────────┘                            │                             │
                                                │  ┌───────────────────────┐  │
                                                │  │      Orchestrator      │  │
                                                │  │  (concurrent dispatch,  │  │
                                                │  │   merge & prioritize)   │  │
                                                │  └──────────┬─────────┬──┘  │
                                                │             │         │     │
                                                │    ┌────────▼──┐  ┌───▼────┐│
                                                │    │Code Analysis│ │Security ││
                                                │    │   Agent    │  │  Agent  ││
                                                │    └────────────┘  └────────┘│
                                                └──────────────┬────────────┘
                                                               │
                                                               ▼
                                                     ┌──────────────────┐
                                                     │  ChromaDB Vector │
                                                     │  Store (built by │
                                                     │  knowledge-base/)│
                                                     └──────────────────┘
```

### Layered Architecture (`backend/app/`)
- `api/`: Endpoint controllers (`submission`, `analysis`, `security`, `orchestration`, `remediation`, `chat`, `pr_summary`, `report`).
- `services/`: Shared business logic (`language_detector`, `syntax_validator`) acting as a single source of truth across all agents.
- `agents/`: Isolated code analysis, security, remediation, and chat agent logic following the SOLID Open/Closed Principle.
- `core/`: Global settings, CORS configuration, and structured logging.

---

## 2. Evaluation Criteria Compliance Matrix

| # | Evaluation Criteria | Implementation Detail | Verification Method |
|---|---|---|---|
| **1** | **Accuracy & Coverage of Code Analysis Agent** | Uses McCabe complexity formulas (`radon` for Python, custom AST walker for Java) to flag long methods, high cyclomatic/cognitive complexity, and deep nesting. | Verified via `tests/test_code_analysis.py` (13 tests passing). |
| **2** | **Effectiveness of Security Vulnerability Agent** | AST-based pattern matching mapping directly to OWASP categories (A02, A03, A07, A08). External tools (Bandit, Semgrep) integrated via isolated `pipx` execution. | Verified via `tests/test_security_agent.py` (17 tests passing). |
| **3** | **Quality & Specificity of Remediation Fixes** | Groq Llama 3.3 70B prompt engineering enforcing structured JSON responses containing explanations, fixed code blocks, and best-practice notes. | Verified via `tests/test_remediation_agent.py` (5 tests passing). |
| **4** | **Relevance & Groundedness of Conversational Assistant** | LangChain + ChromaDB vector search (`all-MiniLM-L6-v2` embeddings) retrieving top-3 OWASP cheat sheet context chunks before LLM synthesis. | Verified via `tests/test_chat_agent.py` (4 tests passing). |
| **5** | **Clarity of PR Summary & Exported PDF Report** | Markdown PR review table + Server-side ReportLab PDF generation (`POST /api/report/pdf`) with health score badges and remediation roadmaps. | Verified via `tests/test_report_pdf.py` (2 tests passing). |
| **6** | **Completeness of Testing & Documentation** | 59/59 unit and integration tests passing in 1.75 seconds. Comprehensive technical decision logs (`docs/decision-log.md`) and 3-tier sample suite. | Automated pytest suite execution. |

---

## 3. Demonstration Test Suite (3 Complexity Tiers)

The project includes 3 distinct code samples in `docs/demo_samples/`:

### Sample 1: Clean Code (`01_clean_code.py`)
- **Characteristics:** Parameterized SQL queries, low complexity, modular functions.
- **Expected Outcome:**
  - **Health Score:** 100 / 100
  - **Findings:** 0
  - **Severity:** LOW (Clean)

### Sample 2: Moderate Code Smells (`02_moderate_code_smells.py`)
- **Characteristics:** Deeply nested decision tree (7 levels), high cyclomatic complexity (score 12 > 10 threshold).
- **Expected Outcome:**
  - **Health Score:** ~70 / 100
  - **Findings:** 2 Code Quality Findings (High Cyclomatic Complexity, Deep Nesting)
  - **Severity:** MEDIUM

### Sample 3: Critical Security Flaws (`03_critical_vulnerabilities.py`)
- **Characteristics:** Inline SQL string concatenation, `os.system()` command execution, MD5 hashing, unpickling raw bytes, hardcoded AWS keys.
- **Expected Outcome:**
  - **Health Score:** < 50 / 100
  - **Findings:** 5+ Security & Quality Findings
  - **Severity:** CRITICAL

---

## 4. How to Run the Final Demonstration

### Step 1: Start Backend Server
```powershell
cd d:\Secoria\backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

### Step 2: Start Frontend Web UI
```powershell
cd d:\Secoria\frontend
npm run dev
```

### Step 3: Run Full Automated Verification Suite
```powershell
cd d:\Secoria\backend
.\venv\Scripts\python.exe -m pytest
```

### Step 4: Perform Web UI Demonstration
1. Open `http://localhost:5173/` in your browser.
2. Select **"Upload File"** and upload `docs/demo_samples/03_critical_vulnerabilities.py`.
3. Click **"Run Full Review"**: Observe concurrent agent execution, severity summary cards, health score gauge, and finding cards.
4. Click **"Get AI Fix Recommendation"** on the SQL Injection finding: Review the Groq LLM corrected code diff.
5. Click **"Ask Assistant"**: Query the RAG Chatbot ("How do I prevent command injection?") and verify cited OWASP PDF sources.
6. Click **"PR Summary"**: Review the markdown PR review comment.
7. Click **"PDF Report"**: Download and inspect the server-generated PDF summary report.

---

*Secoria — Intelligent, Multi-Agent AI Code Review & Security Analysis Platform.*
