"""
Unit tests for the Code Review Report Generation API (/api/report/pdf).
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

SAMPLE_REPORT_PAYLOAD = {
    "language": "python",
    "findings": [
        {
            "title": "OS Command Injection via os.system()",
            "category": "security",
            "source_agent": "security",
            "severity": "critical",
            "line": 12,
            "description": "Call to os.system() with dynamic input allows shell command execution.",
            "rule_id": "SEC-PY-002",
            "owasp_category": "A03: Injection",
            "code_snippet": "os.system(f'ping {host}')"
        },
        {
            "title": "High Cyclomatic Complexity",
            "category": "complexity",
            "source_agent": "code_analysis",
            "severity": "medium",
            "line": 25,
            "description": "Function 'process_permissions' has complexity score of 12 (threshold is 10).",
            "rule_id": "QUAL-PY-001",
            "code_snippet": "def process_permissions(...):"
        }
    ],
    "summary": {
        "total_findings": 2,
        "critical": 1,
        "high": 0,
        "medium": 1,
        "low": 0,
        "code_analysis_findings": 1,
        "security_findings": 1,
        "duplicates_removed": 0
    },
    "overall_severity": "critical",
    "health_score": 65
}


def test_export_pdf_report_success():
    """Verifies that POST /api/report/pdf returns 200 OK with application/pdf and valid PDF header."""
    response = client.post("/api/report/pdf", json=SAMPLE_REPORT_PAYLOAD)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in response.headers["content-disposition"]
    # PDF files start with the magic header bytes %PDF-
    assert response.content.startswith(b"%PDF-")


def test_export_pdf_report_empty_findings():
    """Verifies PDF generation works smoothly even when code has 0 findings."""
    payload = {
        "language": "java",
        "findings": [],
        "summary": {
            "total_findings": 0,
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "code_analysis_findings": 0,
            "security_findings": 0,
            "duplicates_removed": 0
        },
        "overall_severity": "low",
        "health_score": 100
    }
    response = client.post("/api/report/pdf", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")
