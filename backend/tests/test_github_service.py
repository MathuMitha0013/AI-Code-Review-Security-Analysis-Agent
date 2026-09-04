"""
Unit & Integration Tests for GitHub PR Bot & CI/CD Integration.
"""

import hashlib
import hmac
from fastapi.testclient import TestClient
from app.main import app
from app.services.github_service import github_service
from app.orchestrator.schemas import UnifiedReviewReport, UnifiedFinding, UnifiedSummary

client = TestClient(app)

SAMPLE_GIT_DIFF = """
diff --git a/app/user_service.py b/app/user_service.py
index 1234567..89abcdef 100644
--- a/app/user_service.py
+++ b/app/user_service.py
@@ -10,4 +10,7 @@ def get_user(cursor, user_id):
-    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
+    import os
+    API_KEY = "sk-live-998877665544332211"
+    os.system(f"ping {user_id}")
+    cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")
"""

CLEAN_GIT_DIFF = """
diff --git a/app/clean_service.py b/app/clean_service.py
index 1234567..89abcdef 100644
--- a/app/clean_service.py
+++ b/app/clean_service.py
@@ -1,4 +1,5 @@
+import os
 def get_user(cursor, user_id):
+    api_key = os.environ.get("API_KEY", "")
     cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
"""


def test_verify_webhook_signature_valid():
    secret = "test_webhook_secret_123"
    body = b'{"action": "opened", "pull_request": {"number": 1}}'
    mac = hmac.new(secret.encode("utf-8"), msg=body, digestmod=hashlib.sha256)
    valid_sig = f"sha256={mac.hexdigest()}"

    service = github_service.__class__(webhook_secret=secret)
    assert service.verify_webhook_signature(body, valid_sig) is True


def test_verify_webhook_signature_invalid():
    secret = "test_webhook_secret_123"
    body = b'{"action": "opened"}'
    service = github_service.__class__(webhook_secret=secret)
    assert service.verify_webhook_signature(body, "sha256=invalid_hash") is False


def test_parse_pr_url():
    url = "https://github.com/facebook/react/pull/28900"
    parsed = github_service.parse_pr_url(url)
    assert parsed == ("facebook", "react", 28900)

    assert github_service.parse_pr_url("https://invalid-url.com") is None


def test_parse_git_diff():
    files = github_service.parse_git_diff(SAMPLE_GIT_DIFF)
    assert len(files) == 1
    assert files[0]["filename"] == "app/user_service.py"
    assert files[0]["language"] == "python"
    assert "cursor.execute" in files[0]["code"]


def test_generate_inline_comments():
    report = UnifiedReviewReport(
        language="python",
        overall_severity="critical",
        health_score=25,
        findings=[
            UnifiedFinding(
                source_agent="security",
                category="OWASP A03: Injection",
                title="SQL Injection",
                description="Unsanitized user input in query",
                severity="critical",
                line=12,
                code_snippet="cursor.execute(f'SELECT...')"
            )
        ],
        summary=UnifiedSummary(
            total_findings=1,
            critical=1,
            high=0,
            medium=0,
            low=0,
            code_analysis_findings=0,
            security_findings=1
        )
    )
    comments = github_service.generate_inline_comments(report, "app/user_service.py")
    assert len(comments) == 1
    assert comments[0]["line"] == 12
    assert "CRITICAL" in comments[0]["body"]
    assert "SQL Injection" in comments[0]["body"]


def test_simulate_pr_review_endpoint_with_vulnerable_diff():
    resp = client.post("/api/github/simulate-pr-review", json={
        "diff_patch": SAMPLE_GIT_DIFF,
        "post_to_github": False
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["gate_status"] == "BLOCKED"
    assert data["critical_findings"] >= 1
    assert len(data["files_reviewed"]) == 1
    assert data["inline_comments_count"] >= 1


def test_simulate_pr_review_endpoint_clean_diff():
    resp = client.post("/api/github/simulate-pr-review", json={
        "diff_patch": CLEAN_GIT_DIFF,
        "post_to_github": False
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["gate_status"] == "PASSED"
    assert data["critical_findings"] == 0


def test_github_webhook_ping_event():
    resp = client.post(
        "/api/webhook/github",
        headers={"X-GitHub-Event": "ping"},
        content=b'{"zen": "Non-blocking is better than blocking."}'
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
