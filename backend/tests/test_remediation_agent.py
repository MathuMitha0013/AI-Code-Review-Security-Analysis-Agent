"""
Tests for the Remediation Agent (Groq-backed).

WHY MOCK THE GROQ/OPENAI CLIENT INSTEAD OF CALLING THE REAL API?
    Automated tests must run reliably without a rate-limited external API
    dependency, and without requiring every developer (or CI run) to have
    a valid GROQ_API_KEY configured. Mocking `client.chat.completions.create`
    verifies OUR code's logic (request building, error handling, response
    parsing) in isolation from Groq's actual availability.
"""

import json
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_SAMPLE_REQUEST = {
    "finding_title": "SQL Injection via String Concatenation",
    "finding_description": "A query string built with string concatenation allows attacker-controlled input.",
    "code_snippet": "cursor.execute(\"SELECT * FROM users WHERE username = '\" + username + \"'\")",
    "language": "python",
}


def test_remediate_without_api_key_returns_503(monkeypatch):
    """If GROQ_API_KEY isn't configured, the endpoint should fail clearly
    (503, service unavailable) rather than crash unexpectedly."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    monkeypatch.setattr(settings, "GROQ_API_KEY_2", "")
    monkeypatch.setattr(settings, "GROQ_API_KEY_3", "")
    monkeypatch.setattr(settings, "GROQ_API_KEYS", "")

    response = client.post("/api/remediate", json=_SAMPLE_REQUEST)
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]


def test_remediate_success_with_mocked_groq(monkeypatch):
    """Verifies our request-building and response-parsing logic works
    correctly, without depending on Groq's real availability."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", "fake-key-for-testing")

    mock_json_content = json.dumps({
        "explanation": "String concatenation lets attacker input alter the query structure.",
        "fixed_code": "cursor.execute(\"SELECT * FROM users WHERE username = %s\", (username,))",
        "best_practice_notes": "Always use parameterized queries for user-supplied input.",
    })
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content=mock_json_content))]

    with patch("app.agents.remediation.agent.OpenAI") as MockOpenAI:
        mock_client_instance = MockOpenAI.return_value
        mock_client_instance.chat.completions.create.return_value = mock_response

        response = client.post("/api/remediate", json=_SAMPLE_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert body["finding_title"] == _SAMPLE_REQUEST["finding_title"]
    assert "%s" in body["remediation"]["fixed_code"]
    assert "parameterized queries" in body["remediation"]["best_practice_notes"]


def test_remediate_groq_failure_returns_502(monkeypatch):
    """If the Groq API call itself fails (network error, rate limit,
    etc.), the endpoint should return a clear 502, not crash."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", "fake-key-for-testing")

    with patch("app.agents.remediation.agent.OpenAI") as MockOpenAI:
        mock_client_instance = MockOpenAI.return_value
        mock_client_instance.chat.completions.create.side_effect = Exception("API unavailable")

        response = client.post("/api/remediate", json=_SAMPLE_REQUEST)

    assert response.status_code == 502


def test_remediate_malformed_json_returns_502(monkeypatch):
    """If Groq returns text that isn't valid JSON matching our schema,
    the endpoint should fail clearly rather than crash or silently
    return garbage."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", "fake-key-for-testing")

    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="not valid json"))]

    with patch("app.agents.remediation.agent.OpenAI") as MockOpenAI:
        mock_client_instance = MockOpenAI.return_value
        mock_client_instance.chat.completions.create.return_value = mock_response

        response = client.post("/api/remediate", json=_SAMPLE_REQUEST)

    assert response.status_code == 502


def test_remediate_missing_fields_returns_422():
    """Confirms Pydantic validation rejects incomplete requests before
    ever reaching the Groq call."""
    response = client.post("/api/remediate", json={"finding_title": "Incomplete"})
    assert response.status_code == 422
