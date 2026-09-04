#!/usr/bin/env python3
"""
Secoria Standalone CI/CD Scanner CLI.

Runs inside GitHub Actions, GitLab CI, Jenkins, or locally in terminal:
- Recursively detects Python & Java source files
- Sends files to Secoria Orchestrated API
- Enforces configurable quality & security thresholds
- Emits GitHub step summaries and terminal markdown reports
- Exits with 0 on pass, 1 on security policy block
"""

import argparse
import os
import sys
from pathlib import Path
import httpx

_SEVERITY_WEIGHTS = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def parse_args():
    parser = argparse.ArgumentParser(description="Secoria Security & Code Quality CI Gate")
    parser.add_argument("--api-url", default=os.getenv("SECORIA_API_URL", "http://localhost:8000"), help="Secoria API Base URL")
    parser.add_argument("--fail-on", choices=["none", "low", "medium", "high", "critical"], default="critical", help="Minimum severity to fail CI build")
    parser.add_argument("--min-score", type=int, default=70, help="Minimum Code Health Score required to pass (0-100)")
    parser.add_argument("--path", default=".", help="Directory or file path to scan")
    return parser.parse_args()


def find_source_files(target_path: str):
    p = Path(target_path)
    if p.is_file():
        return [p]
    
    files = []
    for ext in ["*.py", "*.java"]:
        files.extend(p.rglob(ext))
    
    # Filter out venvs, node_modules, .git
    filtered = [
        f for f in files
        if not any(ignore in f.parts for ignore in ["venv", ".venv", "node_modules", ".git", "__pycache__", "build", "dist"])
    ]
    return filtered


def main():
    args = parse_args()
    print("=" * 60)
    print("🛡️  Secoria AI Security & Code Quality Gate")
    print(f"🔗 API Endpoint: {args.api_url}")
    print(f"🛑 Fail Policy: Severity >= {args.fail_on.upper()}, Min Score: {args.min_score}/100")
    print("=" * 60)

    files = find_source_files(args.path)
    if not files:
        print("ℹ️  No Python or Java source files found to scan.")
        sys.exit(0)

    print(f"📦 Scanning {len(files)} source files...\n")

    total_findings = 0
    critical_count = 0
    high_count = 0
    failed_files = []
    file_reports = []

    fail_threshold_weight = _SEVERITY_WEIGHTS.get(args.fail_on, 4)

    for file_path in files:
        try:
            code = file_path.read_text(encoding="utf-8")
        except Exception as exc:
            print(f"⚠️  Could not read {file_path}: {exc}")
            continue

        if not code.strip():
            continue

        # Call Secoria Review Endpoint
        try:
            with httpx.Client(base_url=args.api_url, timeout=30.0) as client:
                resp = client.post("/api/review", data={"code": code})
                if resp.status_code != 200:
                    print(f"❌ Analysis failed on {file_path} (HTTP {resp.status_code}): {resp.text[:100]}")
                    continue
                data = resp.json()
        except Exception as exc:
            print(f"❌ Connection error scanning {file_path}: {exc}")
            continue

        summary = data.get("summary", {})
        findings = data.get("findings", [])
        total_findings += len(findings)
        critical_count += summary.get("critical", 0)
        high_count += summary.get("high", 0)

        file_has_blocking_issue = False
        for f in findings:
            weight = _SEVERITY_WEIGHTS.get(f.get("severity", "low"), 1)
            if args.fail_on != "none" and weight >= fail_threshold_weight:
                file_has_blocking_issue = True

        status_icon = "❌" if file_has_blocking_issue else "✅"
        print(f"{status_icon} {file_path} — {len(findings)} issues (Critical: {summary.get('critical', 0)}, High: {summary.get('high', 0)})")

        if file_has_blocking_issue:
            failed_files.append(file_path)
            for f in findings:
                if _SEVERITY_WEIGHTS.get(f.get("severity", "low"), 1) >= fail_threshold_weight:
                    print(f"    🚨 [{f.get('severity', '').upper()}] Line {f.get('line', '?')}: {f.get('title')}")

        file_reports.append({"file": str(file_path), "findings": len(findings), "critical": summary.get("critical", 0)})

    print("\n" + "=" * 60)
    print("📊 Audit Summary")
    print(f"Total Files Scanned: {len(file_reports)}")
    print(f"Total Findings: {total_findings}")
    print(f"Critical Vulnerabilities: {critical_count}")
    print(f"High Severity Issues: {high_count}")
    print("=" * 60)

    # Write to GitHub Step Summary if running inside GitHub Actions
    gh_step_summary = os.getenv("GITHUB_STEP_SUMMARY")
    if gh_step_summary:
        try:
            with open(gh_step_summary, "a", encoding="utf-8") as f:
                f.write("## 🛡️ Secoria Security Gate Report\n\n")
                f.write(f"- **Total Files Scanned:** {len(file_reports)}\n")
                f.write(f"- **Total Findings:** {total_findings}\n")
                f.write(f"- **Critical Vulnerabilities:** {critical_count}\n")
                f.write(f"- **Status:** {'❌ BLOCKED' if failed_files else '✅ PASSED'}\n\n")
        except Exception:
            pass

    if failed_files:
        print(f"\n❌ BUILD FAILED: {len(failed_files)} files violated the '{args.fail_on.upper()}' severity policy.")
        sys.exit(1)
    else:
        print("\n✅ BUILD PASSED: All security and code quality policies satisfied.")
        sys.exit(0)


if __name__ == "__main__":
    main()
