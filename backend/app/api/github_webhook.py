"""
GitHub Webhook and PR Review API Endpoints.

Provides:
1. POST /api/webhook/github — Live GitHub Pull Request Webhook handler.
2. POST /api/github/simulate-pr-review — Interactive PR review & simulator endpoint for the frontend.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app.orchestrator.orchestrator import run_orchestrated_review
from app.services.github_service import github_service
from app.services.language_detector import detect_language
from app.services.syntax_validator import validate_syntax

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["github"])


class SimulatePRRequest(BaseModel):
    pr_url: Optional[str] = Field(default=None, description="GitHub PR URL (e.g., https://github.com/owner/repo/pull/1)")
    diff_patch: Optional[str] = Field(default=None, description="Raw Unified Git Diff patch text")
    github_token: Optional[str] = Field(default=None, description="Optional GitHub Personal Access Token for live posting")
    post_to_github: bool = Field(default=False, description="Whether to actually post the review comment to GitHub")


class FileReviewResult(BaseModel):
    filename: str
    language: str
    health_score: int
    findings_count: int
    critical_count: int
    findings: List[Dict[str, Any]]
    inline_comments: List[Dict[str, Any]]


class SimulatePRResponse(BaseModel):
    status: str
    pr_url: Optional[str] = None
    gate_status: str = Field(..., description="'PASSED' or 'BLOCKED'")
    overall_health_score: int
    total_findings: int
    critical_findings: int
    summary_markdown: str
    files_reviewed: List[FileReviewResult]
    inline_comments_count: int
    github_post_result: Optional[Dict[str, Any]] = None


@router.post("/webhook/github")
async def handle_github_webhook(
    request: Request,
    x_github_event: Optional[str] = Header(default=None, alias="X-GitHub-Event"),
    x_hub_signature_256: Optional[str] = Header(default=None, alias="X-Hub-Signature-256"),
) -> Dict[str, Any]:
    """
    Receives and processes GitHub Pull Request Webhooks.
    """
    body_bytes = await request.body()

    # 1. Verify HMAC Signature
    if not github_service.verify_webhook_signature(body_bytes, x_hub_signature_256):
        logger.warning("Invalid GitHub webhook signature received.")
        raise HTTPException(status_code=401, detail="Invalid HMAC-SHA256 signature.")

    if x_github_event == "ping":
        return {"status": "ok", "message": "Secoria GitHub Webhook active and verified."}

    if x_github_event != "pull_request":
        return {"status": "ignored", "message": f"Event '{x_github_event}' is not handled."}

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON payload.")

    action = payload.get("action")
    if action not in ["opened", "synchronize", "reopened"]:
        return {"status": "ignored", "message": f"PR action '{action}' does not trigger a review."}

    pr = payload.get("pull_request", {})
    repo_data = payload.get("repository", {})
    owner = repo_data.get("owner", {}).get("login")
    repo = repo_data.get("name")
    pull_number = pr.get("number")
    head_sha = pr.get("head", {}).get("sha")

    if not owner or not repo or not pull_number:
        raise HTTPException(status_code=400, detail="Incomplete repository or PR data in webhook.")

    logger.info("Processing GitHub PR Webhook for %s/%s #%d (commit: %s)", owner, repo, pull_number, head_sha)

    # 2. Set commit status to PENDING
    if head_sha:
        await github_service.set_commit_status(
            owner=owner,
            repo=repo,
            commit_sha=head_sha,
            state="pending",
            description="Secoria AI Multi-Agent security review in progress...",
        )

    # 3. Fetch changed files
    try:
        pr_files = await github_service.fetch_pr_files(owner=owner, repo=repo, pull_number=pull_number)
    except Exception as exc:
        logger.error("Failed to fetch PR files: %s", exc)
        return {"status": "error", "message": str(exc)}

    all_findings = []
    all_inline_comments = []
    total_critical = 0

    for f in pr_files:
        filename = f.get("filename", "")
        patch = f.get("patch", "")
        if not patch:
            continue

        # Extract changed code lines from diff patch
        code_lines = [l[1:] for l in patch.splitlines() if l.startswith("+") and not l.startswith("+++")]
        code_content = "\n".join(code_lines)
        if not code_content.strip():
            continue

        language = detect_language(code=code_content, filename=filename)
        if language not in ["python", "java"]:
            continue

        # Syntax check
        is_valid, _ = validate_syntax(code_content, language)
        if not is_valid:
            continue

        try:
            report = await run_orchestrated_review(code=code_content, language=language)
            inline_comments = github_service.generate_inline_comments(report, filename)
            all_findings.extend(report.findings)
            all_inline_comments.extend(inline_comments)
            total_critical += report.summary.critical
        except Exception as err:
            logger.warning("Failed review on PR file %s: %s", filename, err)

    # 4. Determine Gate Status & Format PR Review Markdown
    gate_status = "BLOCKED" if total_critical > 0 else "PASSED"
    status_state = "failure" if total_critical > 0 else "success"
    status_desc = f"Secoria Gate: {gate_status} — {len(all_findings)} issues ({total_critical} critical)"

    summary_md = f"## 🛡️ Secoria AI Security & Code Review\n\n"
    if gate_status == "PASSED":
        summary_md += f"### ✅ Merge Gate Status: **PASSED**\n"
        summary_md += f"No critical OWASP security vulnerabilities were detected in this Pull Request.\n\n"
    else:
        summary_md += f"### 🚨 Merge Gate Status: **BLOCKED (Requires Changes)**\n"
        summary_md += f"Detected **{total_critical} Critical Security Vulnerabilities** that must be remediated prior to merging.\n\n"

    summary_md += f"| Metric | Value |\n| :--- | :---: |\n"
    summary_md += f"| **Total Findings** | **{len(all_findings)}** |\n"
    summary_md += f"| **Critical Vulnerabilities** | **{total_critical}** |\n"
    summary_md += f"| **Inline Annotations** | **{len(all_inline_comments)}** |\n\n"

    # 5. Post PR Review & Commit Status
    post_res = await github_service.post_pr_review(
        owner=owner,
        repo=repo,
        pull_number=pull_number,
        commit_sha=head_sha,
        body_markdown=summary_md,
        inline_comments=all_inline_comments,
        event="REQUEST_CHANGES" if total_critical > 0 else "COMMENT",
    )

    if head_sha:
        await github_service.set_commit_status(
            owner=owner,
            repo=repo,
            commit_sha=head_sha,
            state=status_state,
            description=status_desc,
        )

    return {
        "status": "processed",
        "gate_status": gate_status,
        "findings_count": len(all_findings),
        "critical_count": total_critical,
        "inline_comments_count": len(all_inline_comments),
        "github_review": post_res,
    }


@router.post("/github/simulate-pr-review", response_model=SimulatePRResponse)
async def simulate_pr_review(req: SimulatePRRequest) -> SimulatePRResponse:
    """
    Simulates or executes a GitHub Pull Request review from URL or raw Git Diff.
    """
    files_to_review = []
    owner, repo, pull_number = None, None, None

    # 1. Parse from PR URL
    if req.pr_url:
        parsed = github_service.parse_pr_url(req.pr_url)
        if not parsed:
            raise HTTPException(status_code=400, detail="Invalid GitHub PR URL format. Expected: https://github.com/owner/repo/pull/123")
        owner, repo, pull_number = parsed

        try:
            gh_files = await github_service.fetch_pr_files(owner, repo, pull_number, token=req.github_token)
            for f in gh_files:
                fn = f.get("filename", "")
                patch = f.get("patch", "")
                if patch:
                    code_lines = [l[1:] for l in patch.splitlines() if l.startswith("+") and not l.startswith("+++")]
                    files_to_review.append({
                        "filename": fn,
                        "code": "\n".join(code_lines),
                        "language": "python" if fn.endswith(".py") else "java" if fn.endswith(".java") else "unknown"
                    })
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to fetch PR from GitHub API: {exc}")

    # 2. Parse from raw Git Diff
    elif req.diff_patch:
        files_to_review = github_service.parse_git_diff(req.diff_patch)
        if not files_to_review:
            raise HTTPException(status_code=400, detail="Could not parse any modified code files from the provided Git Diff patch.")
    else:
        raise HTTPException(status_code=400, detail="Provide either 'pr_url' or 'diff_patch'.")

    file_results: List[FileReviewResult] = []
    all_inline_comments = []
    total_findings = 0
    total_critical = 0
    total_high = 0
    health_scores = []

    for item in files_to_review:
        fn = item["filename"]
        code = item["code"]
        lang = item["language"] if item["language"] != "unknown" else detect_language(code, fn)

        if lang not in ["python", "java"]:
            continue

        is_valid, _ = validate_syntax(code, lang)
        if not is_valid:
            continue

        try:
            report = await run_orchestrated_review(code=code, language=lang)
            inline = github_service.generate_inline_comments(report, fn)
            all_inline_comments.extend(inline)

            findings_dicts = [
                {
                    "title": f.title,
                    "severity": f.severity,
                    "category": f.category,
                    "line": f.line,
                    "description": f.description,
                    "code_snippet": f.code_snippet,
                    "source_agent": f.source_agent,
                }
                for f in report.findings
            ]

            score = max(0, 100 - (report.summary.critical * 25 + report.summary.high * 15 + report.summary.medium * 5))
            health_scores.append(score)
            total_findings += len(report.findings)
            total_critical += report.summary.critical
            total_high += report.summary.high

            file_results.append(FileReviewResult(
                filename=fn,
                language=lang,
                health_score=score,
                findings_count=len(report.findings),
                critical_count=report.summary.critical,
                findings=findings_dicts,
                inline_comments=inline,
            ))
        except Exception as err:
            logger.warning("Error reviewing PR file %s: %s", fn, err)

    overall_score = sum(health_scores) // len(health_scores) if health_scores else 100
    gate_status = "BLOCKED" if total_critical > 0 or total_high > 0 or overall_score < 75 else "PASSED"

    # Build Summary Markdown
    summary_md = f"## 🛡️ Secoria PR Review Report\n\n"
    if gate_status == "PASSED":
        summary_md += f"### ✅ CI/CD Merge Gate: **PASSED** (Score: {overall_score}/100)\n"
        summary_md += f"Pull request meets security standards. Ready for merge approval.\n\n"
    else:
        summary_md += f"### 🚨 CI/CD Merge Gate: **BLOCKED** (Score: {overall_score}/100)\n"
        summary_md += f"Contains **{total_critical} Critical** and **{total_high} High-severity** findings. Remediation required before merging.\n\n"

    summary_md += f"| Metric | Value |\n| :--- | :---: |\n"
    summary_md += f"| **Files Analyzed** | **{len(file_results)}** |\n"
    summary_md += f"| **Total Findings** | **{total_findings}** |\n"
    summary_md += f"| **Critical Issues** | **{total_critical}** |\n"
    summary_md += f"| **High Severity Issues** | **{total_high}** |\n"
    summary_md += f"| **Inline Annotations** | **{len(all_inline_comments)}** |\n\n"

    # Optional Live GitHub Posting
    gh_post_res = None
    if req.post_to_github and owner and repo and pull_number:
        gh_post_res = await github_service.post_pr_review(
            owner=owner,
            repo=repo,
            pull_number=pull_number,
            commit_sha=None,
            body_markdown=summary_md,
            inline_comments=all_inline_comments,
            token=req.github_token,
            event="REQUEST_CHANGES" if gate_status == "BLOCKED" else "COMMENT",
        )

    return SimulatePRResponse(
        status="success",
        pr_url=req.pr_url,
        gate_status=gate_status,
        overall_health_score=overall_score,
        total_findings=total_findings,
        critical_findings=total_critical,
        summary_markdown=summary_md,
        files_reviewed=file_results,
        inline_comments_count=len(all_inline_comments),
        github_post_result=gh_post_res,
    )
