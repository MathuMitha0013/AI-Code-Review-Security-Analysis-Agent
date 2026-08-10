"""
Tests for the PR Summary Agent (Milestone 3).

Mocks the external Groq API to verify review summaries compile
successfully, return correctly formatted markdown blocks, and handle exceptions.
"""

from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_SAMPLE_REPORT = {
    "language": "python",
    "findings": [
        {
            "source_agent": "security",
            "category": "A03:2021-Injection",
            "title": "Possible OS Command Injection via exec()",
            "description": "An 'exec(...)' call was found.",
            "severity": "critical",
            "line": 15,
            "code_snippet": "eval(user_input)",
        }
    ],
    "summary": {
        "total_findings": 1,
        "critical": 1,
        "high": 0,
        "medium": 0,
        "low": 0,
        "code_analysis_findings": 0,
        "security_findings": 1,
        "duplicates_removed": 0,
    },
    "overall_severity": "critical",
    "health_score": 75,
}


def test_pr_summary_without_api_key_returns_503(monkeypatch):
    """If GROQ_API_KEY is not defined, return a 503 Service Unavailable."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "GROQ_API_KEY", "")

    response = client.post("/api/pr-summary", json=_SAMPLE_REPORT)
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]


def test_pr_summary_success_with_mocked_groq(monkeypatch):
    """Verifies that the route creates OpenAI completion messages and returns LLM outputs."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "GROQ_API_KEY", "fake-key-for-testing")

    mock_markdown = (
        "### 🚀 Secoria PR Review Summary\n"
        "This python code has a health score of 75/100.\n\n"
        "### 📊 Severity Breakdown\n"
        "| Agent | Critical | High | Medium | Low | Total |\n"
        "| :--- | :---: | :---: | :---: | :---: | :---: |\n"
        "| **Combined** | **1** | **0** | **0** | **0** | **1** |"
    )

    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock(message=MagicMock(content=mock_markdown))]

    with patch("app.api.pr_summary.OpenAI") as MockOpenAI:
        mock_client_instance = MockOpenAI.return_value
        mock_client_instance.chat.completions.create.return_value = mock_groq_response

        response = client.post("/api/pr-summary", json=_SAMPLE_REPORT)

        assert response.status_code == 200
        assert response.json()["markdown"] == mock_markdown
        # Assert parameters passed to OpenAI completions
        mock_client_instance.chat.completions.create.assert_called_once()


def test_pr_summary_api_failure_returns_502(monkeypatch):
    """If Groq service raises an API exception, route translates it to an HTTP 502."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "GROQ_API_KEY", "fake-key-for-testing")

    with patch("app.api.pr_summary.OpenAI") as MockOpenAI:
        mock_client_instance = MockOpenAI.return_value
        mock_client_instance.chat.completions.create.side_effect = Exception("Rate limit exceeded")

        response = client.post("/api/pr-summary", json=_SAMPLE_REPORT)

        assert response.status_code == 502
        assert "LLM service" in response.json()["detail"]
