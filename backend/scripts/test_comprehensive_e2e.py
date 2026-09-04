"""
Comprehensive End-to-End System Test Script for Secoria Platform.
Tests all agents, services, routers, and edge cases live against http://127.0.0.1:8000.
"""

import io
import sys
import zipfile
import httpx

BASE_URL = "http://127.0.0.1:8000"

def log_test(name, passed, details=""):
    symbol = "[PASS]" if passed else "[FAIL]"
    print(f"{symbol} {name} {details}")
    if not passed:
        sys.exit(1)

def main():
    print("=================================================================")
    print("SECORIA COMPREHENSIVE PLATFORM INTEGRATION & COMPONENT TEST")
    print("=================================================================\n")

    client = httpx.Client(base_url=BASE_URL, timeout=90.0)

    # 1. Health Liveness
    r = client.get("/health")
    log_test("1. Health Endpoint (/health)", r.status_code == 200, f"- Status {r.status_code}")

    # 2. Syntax Validation & Language Detection
    r = client.post("/api/submit", data={"code": "def hello():\n    return 'world'"})
    log_test("2. Code Submission & Validation (/api/submit)", r.status_code == 200 and r.json().get("language") == "python", f"- Detected: {r.json().get('language')}")

    # 3. Static Code Analysis Agent (Radon / Smells)
    r = client.post("/api/analyze", data={"code": "def test():\n    if True:\n        pass"})
    log_test("3. Code Analysis Agent (/api/analyze)", r.status_code == 200 and "findings" in r.json() and "summary" in r.json())

    # 4. Security Vulnerability Agent (OWASP)
    vulnerable_code = 'import os\nAPI_KEY="sk-live-12345"\ndef ping(host):\n    os.system(f"ping {host}")\n'
    r = client.post("/api/security-scan", data={"code": vulnerable_code})
    sec_data = r.json()
    log_test("4. Security Vulnerability Agent (/api/security-scan)", r.status_code == 200 and len(sec_data.get("findings", [])) >= 2, f"- Found {len(sec_data.get('findings', []))} security findings")

    # 5. Full Orchestrated Review (Merged & Scored)
    r = client.post("/api/review", data={"code": vulnerable_code})
    rev_data = r.json()
    log_test("5. Multi-Agent Orchestrator (/api/review)", r.status_code == 200 and "health_score" in rev_data, f"- Health Score: {rev_data.get('health_score')}/100")

    # 6. Multi-File ZIP Archive Engine (Python + Java)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("services/auth.py", "import os\nAPI_KEY='sk-test-123'\n")
        z.writestr("controllers/UserController.java", "package com.app;\npublic class UserController {\n    public void test() {}\n}\n")
        z.writestr("notes.txt", "This is documentation")
    buf.seek(0)
    r = client.post("/api/review-zip", files={"file": ("project.zip", buf.getvalue(), "application/zip")})
    zip_data = r.json()
    log_test("6. Multi-File ZIP Project Review (/api/review-zip)", r.status_code == 200 and zip_data.get("summary", {}).get("total_files_scanned") == 2, f"- Scanned {zip_data.get('summary', {}).get('total_files_scanned')} source files across Python and Java")

    # 7. AI Remediation Engine (Single Finding Patch)
    rem_payload = {
        "finding_title": "Hardcoded API Key",
        "finding_description": "Hardcoded API secret found in source code.",
        "code_snippet": "API_KEY='sk-test-123'",
        "language": "python",
        "full_code": vulnerable_code
    }
    r = client.post("/api/remediate", json=rem_payload)
    rem_data = r.json()
    log_test("7. AI Remediation Agent (/api/remediate)", r.status_code == 200 and "remediation" in rem_data and "fixed_code" in rem_data["remediation"], f"- Fixed code generated successfully")

    # 8. GitHub PR Review Bot & Diff Simulator
    diff_patch = """diff --git a/app/auth.py b/app/auth.py
index 1111111..2222222 100644
--- a/app/auth.py
+++ b/app/auth.py
@@ -1,3 +1,5 @@
+import os
+os.system("rm -rf " + user_input)
"""
    r = client.post("/api/github/simulate-pr-review", json={"diff_patch": diff_patch, "post_to_github": False})
    pr_data = r.json()
    log_test("8. GitHub PR Review Bot (/api/github/simulate-pr-review)", r.status_code == 200 and pr_data.get("gate_status") == "BLOCKED", f"- Gate Status: {pr_data.get('gate_status')}, Inline comments: {pr_data.get('inline_comments_count')}")

    # 9. PDF Security Audit Report Generation
    r = client.post("/api/report/pdf", json=rev_data)
    log_test("9. PDF Audit Report Generator (/api/report/pdf)", r.status_code == 200 and "application/pdf" in r.headers.get("content-type", ""), f"- Generated PDF: {len(r.content)} bytes")

    # 10. RAG Knowledge Assistant
    r = client.post("/api/chat", json={"message": "What does OWASP say about SQL Injection prevention?"})
    chat_data = r.json()
    log_test("10. Conversational RAG Assistant (/api/chat)", r.status_code == 200 and len(chat_data.get("reply", "")) > 10, f"- Reply length: {len(chat_data.get('reply', ''))} chars, Citations: {len(chat_data.get('citations', []))}")

    print("\n=================================================================")
    print("SUCCESS: ALL 10 CORE SUBSYSTEMS & API SERVICES PASSED END-TO-END!")
    print("=================================================================\n")

if __name__ == "__main__":
    main()
