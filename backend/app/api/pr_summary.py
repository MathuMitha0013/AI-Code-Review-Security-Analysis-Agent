"""
PR Summary Agent API route handler (Milestone 3).

Receives the UnifiedReviewReport JSON payload and calls Groq (Llama-3.3)
to generate a structured Pull Request review comment markdown block.
"""

import logging
from fastapi import APIRouter, HTTPException
from openai import OpenAI

from app.core.config import settings
from app.core.llm_manager import llm_manager
from app.models.pr_summary_schema import PRSummaryResponse
from app.orchestrator.schemas import UnifiedReviewReport

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["pr_summary"])


@router.post("/pr-summary", response_model=PRSummaryResponse)
async def generate_pr_summary(report: UnifiedReviewReport) -> PRSummaryResponse:
    """
    Compiles code review findings into a human-readable markdown summary
    suitable for copy-pasting directly as a Pull Request review comment.
    """
    if not settings.GROQ_API_KEY and not getattr(settings, "GROQ_API_KEYS", ""):
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY is not configured. Set it in backend/.env to use the PR Summary Agent.",
        )

    # 1. Format the findings list for the LLM
    findings_list = []
    for idx, f in enumerate(report.findings):
        findings_list.append(
            f"Finding {idx + 1}:\n"
            f"  - Title: {f.title}\n"
            f"  - Category: {f.category}\n"
            f"  - Agent: {f.source_agent}\n"
            f"  - Severity: {f.severity}\n"
            f"  - Line: {f.line if f.line is not None else 'N/A'}\n"
            f"  - Description: {f.description}\n"
        )
    findings_text = "\n---\n".join(findings_list)

    # 2. Formulate Prompt containing the review summary and findings list
    system_instruction = (
        "You are 'Secoria PR Review Agent', a senior software architect and secure coding reviewer. "
        "Your task is to compile a structured, developer-focused Pull Request review summary based on "
        "the provided code analysis report.\n\n"
        "YOUR REPORT MUST CONFORM STRICTLY TO THE FOLLOWING MARKDOWN FORMAT:\n"
        "### 🚀 Secoria PR Review Summary\n"
        "Provide a 2-3 sentence executive summary. State the language reviewed, the calculated "
        "Code Health Score, and a clear directive on whether this PR is safe to merge, needs work, "
        "or is blocked due to critical security risks.\n\n"
        "### 📊 Severity Breakdown\n"
        "Create a markdown table summarizing findings by agent and severity:\n"
        "| Agent | Critical | High | Medium | Low | Total |\n"
        "| :--- | :---: | :---: | :---: | :---: | :---: |\n"
        "| Code Quality | <count> | <count> | <count> | <count> | <count> |\n"
        "| Security | <count> | <count> | <count> | <count> | <count> |\n"
        "| **Combined** | **<count>** | **<count>** | **<count>** | **<count>** | **<count>** |\n\n"
        "### ⚠️ Key Blocking Issues\n"
        "Highlight the most severe issues (especially Critical and High findings, like OWASP vulnerabilities "
        "or complex code blocks). List them as bullet points. Briefly state: what the issue is, why it blocks "
        "merging, and key recommendations to fix it. If there are zero critical/high issues, write 'No blocking issues found.'\n\n"
        "### 💡 Action Plan\n"
        "Provide a clean, numbered list of step-by-step next steps for the developer to resolve these issues "
        "before merging the PR.\n\n"
        "TONE & STYLE RULES:\n"
        "- Remain professional, constructive, and encouraging but technically precise.\n"
        "- Never mention internal backend paths or Python library names in the summary.\n"
        "- Rely strictly on the finding details provided; do not hallucinate findings that are not in the list.\n"
    )

    prompt_body = (
        f"REVIEW REPORT:\n"
        f"- Language: {report.language}\n"
        f"- Health Score: {report.health_score}/100\n"
        f"- Overall Severity: {report.overall_severity.upper()}\n"
        f"- Findings Count: {report.summary.total_findings}\n\n"
        f"SUMMARY STATISTICS:\n"
        f"  - Total findings: {report.summary.total_findings}\n"
        f"  - Critical: {report.summary.critical}\n"
        f"  - High: {report.summary.high}\n"
        f"  - Medium: {report.summary.medium}\n"
        f"  - Low: {report.summary.low}\n"
        f"  - Code Quality Findings: {report.summary.code_analysis_findings}\n"
        f"  - Security Findings: {report.summary.security_findings}\n\n"
        f"DETAILED FINDINGS LIST:\n"
        f"{findings_text}\n"
    )

    # 3. Call LLM via resilient Key & Model Manager
    try:
        markdown_result = llm_manager.execute_chat_completion(
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt_body},
            ],
            temperature=0.2,
        )
    except RuntimeError as r_exc:
        if "not configured" in str(r_exc):
            raise HTTPException(status_code=503, detail=str(r_exc))
        raise HTTPException(
            status_code=502,
            detail=f"Failed to communicate with LLM service: {r_exc}",
        )
    except Exception as exc:
        logger.error("LLM call failed during PR summary generation: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to communicate with LLM service: {exc}",
        )

    return PRSummaryResponse(markdown=markdown_result)
