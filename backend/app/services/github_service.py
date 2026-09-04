"""
GitHub Integration Service for Secoria PR Bot & CI/CD Pipelines.

Handles:
1. Webhook HMAC-SHA256 signature verification.
2. Fetching Pull Request modified files and diff patches via GitHub REST API.
3. Generating rich markdown inline review comments and executive PR review summaries.
4. Setting GitHub commit statuses (pass/fail security gate).
5. Offline/Simulated Git Diff parsing for developer testing and zero-token usage.
"""

import hashlib
import hmac
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.config import settings
from app.orchestrator.schemas import UnifiedReviewReport

logger = logging.getLogger(__name__)

_GITHUB_API_BASE = "https://api.github.com"


class GitHubService:
    def __init__(self, token: Optional[str] = None, webhook_secret: Optional[str] = None):
        self.token = token or settings.GITHUB_TOKEN
        self.webhook_secret = webhook_secret or settings.GITHUB_WEBHOOK_SECRET

    def verify_webhook_signature(self, payload_bytes: bytes, signature_header: Optional[str]) -> bool:
        """
        Validates GitHub webhook HMAC-SHA256 signature (X-Hub-Signature-256).
        """
        secret = self.webhook_secret
        if not secret:
            logger.warning("No GITHUB_WEBHOOK_SECRET configured; skipping signature verification.")
            return True

        if not signature_header:
            return False

        mac = hmac.new(secret.encode("utf-8"), msg=payload_bytes, digestmod=hashlib.sha256)
        expected_sig = f"sha256={mac.hexdigest()}"
        return hmac.compare_digest(expected_sig, signature_header)

    @staticmethod
    def parse_pr_url(url: str) -> Optional[Tuple[str, str, int]]:
        """
        Extracts (owner, repo, pull_number) from a GitHub PR URL:
        e.g. https://github.com/owner/repo/pull/42 -> ('owner', 'repo', 42)
        """
        match = re.search(r"github\.com/([^/]+)/([^/]+)/pull/(\d+)", url)
        if match:
            return match.group(1), match.group(2), int(match.group(3))
        return None

    @staticmethod
    def parse_git_diff(diff_text: str) -> List[Dict[str, Any]]:
        """
        Parses a unified git diff patch into structured file objects
        containing filename, added code lines, and language detection.
        """
        import textwrap

        files = []
        current_file = None
        current_lines = []
        in_hunk = False

        for line in diff_text.splitlines():
            if line.startswith("diff --git"):
                if current_file and current_lines:
                    dedented = textwrap.dedent("\n".join(current_lines)).strip()
                    if dedented:
                        files.append({
                            "filename": current_file,
                            "code": dedented,
                            "language": "python" if current_file.endswith(".py") else "java" if current_file.endswith(".java") else "unknown"
                        })
                parts = line.split(" ")
                current_file = parts[3].lstrip("b/") if len(parts) >= 4 else "unknown_file"
                current_lines = []
                in_hunk = False
            elif line.startswith("+++ b/"):
                current_file = line[6:].strip()
            elif line.startswith("@@"):
                in_hunk = True
            elif in_hunk:
                if line.startswith("+") and not line.startswith("+++"):
                    current_lines.append(line[1:])
                elif line.startswith(" ") or (not line.startswith("-") and not line.startswith("diff")):
                    current_lines.append(line.lstrip(" "))

        if current_file and current_lines:
            dedented = textwrap.dedent("\n".join(current_lines)).strip()
            if dedented:
                files.append({
                    "filename": current_file,
                    "code": dedented,
                    "language": "python" if current_file.endswith(".py") else "java" if current_file.endswith(".java") else "unknown"
                })

        return files

    async def fetch_pr_files(self, owner: str, repo: str, pull_number: int, token: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetches modified files from GitHub Pull Request API.
        """
        auth_token = token or self.token
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Secoria-PR-Bot",
        }
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        url = f"{_GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pull_number}/files"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.error("Failed to fetch PR files from GitHub (%d): %s", resp.status_code, resp.text)
                raise RuntimeError(f"GitHub API error ({resp.status_code}): {resp.text}")
            return resp.json()

    @staticmethod
    def _build_suggested_fix(finding: Any, filename: str) -> Optional[str]:
        """Generates a drop-in suggested code block for GitHub PRs."""
        snippet = finding.code_snippet or ""
        title = (finding.title or "").lower()

        if "command injection" in title or "os.system" in snippet:
            return 'subprocess.run(["echo", "safe_arg"], check=True)'
        if "sql injection" in title or "execute(" in snippet:
            if filename.endswith(".py"):
                return 'cursor.execute("SELECT * FROM users WHERE username = %s", (username,))'
            else:
                return 'PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");\nstmt.setString(1, userId);\nResultSet rs = stmt.executeQuery();'
        if "hardcoded credential" in title or "api_key" in snippet.lower() or "secret" in snippet.lower():
            if filename.endswith(".py"):
                return 'API_KEY = os.environ.get("API_KEY", "")'
            else:
                return 'String apiKey = System.getenv("API_KEY");'
        if "weak hash" in title or "md5" in snippet.lower():
            if filename.endswith(".py"):
                return 'hashlib.sha256(data.encode()).hexdigest()'
            else:
                return 'MessageDigest md = MessageDigest.getInstance("SHA-256");'
        if "cookie" in title and "httponly" in snippet.lower():
            if filename.endswith(".py"):
                return 'response.set_cookie("AUTH_TOKEN", value="secure_token", httponly=True, secure=True, samesite="Lax")'
            else:
                return 'sessionCookie.setHttpOnly(true);\nsessionCookie.setSecure(true);'
        return None

    @classmethod
    def generate_inline_comments(cls, report: UnifiedReviewReport, filename: str) -> List[Dict[str, Any]]:
        """
        Builds rich GitHub PR inline review comments targeting specific lines
        with GitHub Suggested Change markdown blocks.
        """
        comments = []
        severity_emojis = {
            "critical": "🚨 **[CRITICAL SECURITY RISK]**",
            "high": "⚠️ **[HIGH SEVERITY ISSUE]**",
            "medium": "🔍 **[MEDIUM QUALITY SMELL]**",
            "low": "💡 **[LOW NOTICE]**",
        }

        for finding in report.findings:
            if finding.line is not None and finding.line > 0:
                prefix = severity_emojis.get(finding.severity, "ℹ️")
                body = (
                    f"{prefix} **Secoria Analysis: {finding.title}**\n\n"
                    f"{finding.description}\n\n"
                    f"- **Category / Standard:** `{finding.category}`\n"
                    f"- **Detected by:** `{finding.source_agent.replace('_', ' ').title()}`\n\n"
                )
                if finding.code_snippet:
                    body += f"**Flagged Code:**\n```\n{finding.code_snippet}\n```\n\n"

                suggested_fix = cls._build_suggested_fix(finding, filename)
                if suggested_fix:
                    body += f"**Recommended Fix (Click 'Commit suggestion' to apply):**\n```suggestion\n{suggested_fix}\n```\n\n"

                body += "_Automated review powered by Secoria AI Agent._"

                comments.append({
                    "path": filename,
                    "line": finding.line,
                    "side": "RIGHT",
                    "body": body,
                    "severity": finding.severity,
                    "title": finding.title,
                    "suggested_fix": suggested_fix,
                })
        return comments

    async def post_pr_review(
        self,
        owner: str,
        repo: str,
        pull_number: int,
        commit_sha: Optional[str],
        body_markdown: str,
        inline_comments: List[Dict[str, Any]],
        token: Optional[str] = None,
        event: str = "COMMENT",
    ) -> Dict[str, Any]:
        """
        Posts a complete review with inline comments to GitHub PR.
        """
        auth_token = token or self.token
        if not auth_token:
            logger.info("Dry-run / Simulated PR Review (No GitHub token provided)")
            return {
                "status": "simulated",
                "message": "Review generated successfully in dry-run mode.",
                "review_body": body_markdown,
                "inline_comments_count": len(inline_comments),
            }

        headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {auth_token}",
            "User-Agent": "Secoria-PR-Bot",
        }

        payload: Dict[str, Any] = {
            "body": body_markdown,
            "event": event,
        }
        if commit_sha:
            payload["commit_id"] = commit_sha

        # GitHub API accepts comments as {path, line, body}
        formatted_comments = [
            {"path": c["path"], "line": c["line"], "body": c["body"]}
            for c in inline_comments if "path" in c and "line" in c
        ]
        if formatted_comments and commit_sha:
            payload["comments"] = formatted_comments

        url = f"{_GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pull_number}/reviews"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code not in (200, 201):
                logger.error("Failed to post PR review to GitHub (%d): %s", resp.status_code, resp.text)
                raise RuntimeError(f"GitHub API review post failed ({resp.status_code}): {resp.text}")
            return resp.json()

    async def set_commit_status(
        self,
        owner: str,
        repo: str,
        commit_sha: str,
        state: str,
        description: str,
        token: Optional[str] = None,
        target_url: str = "http://localhost:5173",
    ) -> Dict[str, Any]:
        """
        Sets commit status check gate (success/failure/pending) on GitHub.
        """
        auth_token = token or self.token
        if not auth_token or not commit_sha:
            return {"status": "simulated", "state": state, "description": description}

        headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {auth_token}",
            "User-Agent": "Secoria-PR-Bot",
        }
        payload = {
            "state": state,
            "description": description[:140],
            "context": "secoria/security-gate",
            "target_url": target_url,
        }
        url = f"{_GITHUB_API_BASE}/repos/{owner}/{repo}/statuses/{commit_sha}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code not in (200, 201):
                logger.warning("Failed to set commit status (%d): %s", resp.status_code, resp.text)
            return resp.json() if resp.status_code in (200, 201) else {"status": "error"}


github_service = GitHubService()
