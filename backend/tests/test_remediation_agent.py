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


def test_remediate_without_api_key_returns_fallback(monkeypatch):
    """If GROQ_API_KEY/GEMINI_API_KEY isn't configured, the endpoint should seamlessly
    activate deterministic fallback rather than crashing."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    monkeypatch.setattr(settings, "GROQ_API_KEY_2", "")
    monkeypatch.setattr(settings, "GROQ_API_KEY_3", "")
    monkeypatch.setattr(settings, "GROQ_API_KEYS", "")

    response = client.post("/api/remediate", json=_SAMPLE_REQUEST)
    assert response.status_code == 200
    body = response.json()
    assert "%s" in body["remediation"]["fixed_code"]


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

    with patch("app.core.llm_manager.OpenAI") as MockOpenAI:
        mock_client_instance = MockOpenAI.return_value
        mock_client_instance.chat.completions.create.return_value = mock_response

        response = client.post("/api/remediate", json=_SAMPLE_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert body["finding_title"] == _SAMPLE_REQUEST["finding_title"]
    assert "%s" in body["remediation"]["fixed_code"]
    assert "parameterized queries" in body["remediation"]["best_practice_notes"]


def test_remediate_groq_failure_returns_fallback(monkeypatch):
    """If the Groq API call itself fails (network error, rate limit,
    etc.), the endpoint should smoothly activate deterministic fallback."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", "fake-key-for-testing")

    with patch("app.core.llm_manager.OpenAI") as MockOpenAI:
        mock_client_instance = MockOpenAI.return_value
        mock_client_instance.chat.completions.create.side_effect = Exception("API unavailable")

        response = client.post("/api/remediate", json=_SAMPLE_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert "%s" in body["remediation"]["fixed_code"]


def test_remediate_malformed_json_returns_fallback(monkeypatch):
    """If Groq returns text that isn't valid JSON matching our schema,
    the endpoint should activate deterministic fallback rather than crashing."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", "fake-key-for-testing")

    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="not valid json"))]

    with patch("app.core.llm_manager.OpenAI") as MockOpenAI:
        mock_client_instance = MockOpenAI.return_value
        mock_client_instance.chat.completions.create.return_value = mock_response

        response = client.post("/api/remediate", json=_SAMPLE_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert "%s" in body["remediation"]["fixed_code"]


def test_remediate_missing_fields_returns_422():
    """Confirms Pydantic validation rejects incomplete requests before
    ever reaching the Groq call."""
    response = client.post("/api/remediate", json={"finding_title": "Incomplete"})
    assert response.status_code == 422


def test_remediate_all_java_deterministic_fallback():
    import javalang
    from app.agents.remediation.agent import _deterministic_remediation_fallback
    from app.models.remediate_all_schema import RemediateAllRequest

    java_code = (
        'public class SecurityTestPortal {\n'
        '    private static final String apiKey = "AIzaSyD-123456";\n'
        '    public void run(java.sql.Statement stmt, String username) throws Exception {\n'
        '        stmt.executeQuery("SELECT * FROM accounts WHERE name = \'" + username + "\'");\n'
        '    }\n'
        '    public void render(javax.servlet.http.HttpServletResponse response, String param) throws Exception {\n'
        '        response.getWriter().write("<div>Hello " + param + "</div>");\n'
        '    }\n'
        '    public void runCmd(String tool) throws Exception {\n'
        '        Runtime.getRuntime().exec(tool);\n'
        '    }\n'
        '    public void hashData() throws Exception {\n'
        '        java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");\n'
        '    }\n'
        '    public void makeRandom() {\n'
        '        java.util.Random rand = new java.util.Random();\n'
        '    }\n'
        '    public void makeCookie(javax.servlet.http.Cookie cookie) {\n'
        '        cookie.setHttpOnly(false);\n'
        '    }\n'
        '    public Object deserializeObject(byte[] buffer) throws Exception {\n'
        '        java.io.ObjectInputStream ois = new java.io.ObjectInputStream(new java.io.ByteArrayInputStream(buffer));\n'
        '        return ois.readObject();\n'
        '    }\n'
        '}\n'
    )
    req = RemediateAllRequest(full_code=java_code, language="java", findings=[{"title": "Issue", "severity": "high"}])
    res = _deterministic_remediation_fallback(req)

    assert "PreparedStatement" in res.remediated_code
    assert "System.getenv" in res.remediated_code
    assert "ProcessBuilder" in res.remediated_code
    assert "SHA-256" in res.remediated_code
    assert "SecureRandom" in res.remediated_code
    assert "setHttpOnly(true)" in res.remediated_code
    assert "Encode.forHtml" in res.remediated_code
    assert "ObjectMapper" in res.remediated_code
    assert len(res.changelog) >= 6

    # Verify that the resulting Java code is 100% syntactically valid
    tree = javalang.parse.parse(res.remediated_code)
    assert tree is not None


def test_remediate_all_python_deterministic_fallback():
    import ast
    from app.agents.remediation.agent import _deterministic_remediation_fallback
    from app.models.remediate_all_schema import RemediateAllRequest

    py_code = (
        'import os, hashlib, pickle, random, subprocess\n'
        'API_KEY = "sk-live-1234567890abcdef"\n'
        'def get_user(cursor, user_id):\n'
        '    cursor.execute(f"SELECT * FROM users WHERE id = \'{user_id}\'")\n'
        'def hash_pwd(pwd):\n'
        '    return hashlib.md5(pwd.encode()).hexdigest()\n'
        'def parse_data(raw):\n'
        '    return pickle.loads(raw)\n'
        'def render(template, user_input):\n'
        '    return render_template_string("<h1>" + user_input + "</h1>")\n'
        'def make_token():\n'
        '    return random.randint(1000, 9999)\n'
        'def ping_host(host):\n'
        '    os.system(f"ping {host}")\n'
    )
    req = RemediateAllRequest(full_code=py_code, language="python", findings=[{"title": "Issue", "severity": "high"}])
    res = _deterministic_remediation_fallback(req)

    assert "%s" in res.remediated_code
    assert "os.environ.get" in res.remediated_code
    assert "sha256" in res.remediated_code
    assert "json.loads" in res.remediated_code
    assert "render_template" in res.remediated_code
    assert "subprocess.run" in res.remediated_code
    assert "secrets.randbelow" in res.remediated_code

    # Verify that the resulting Python code is 100% syntactically valid
    tree = ast.parse(res.remediated_code)
    assert tree is not None


def test_extract_json_payload_with_think_tags():
    from app.agents.remediation.agent import _extract_json_payload

    response_text = (
        "<think>\n"
        "Here is my step by step reasoning:\n"
        "1. Fix the SQL injection\n"
        "2. Return the JSON object\n"
        "{\n"
        '  "fake_key": "ignore this"\n'
        "}\n"
        "</think>\n"
        "```json\n"
        "{\n"
        '  "remediated_code": "public class CleanApp {}",\n'
        '  "changelog": ["Fixed SQL injection", "Extracted secrets"],\n'
        '  "summary": "Secure refactoring applied.",\n'
        '  "projected_score": 100\n'
        "}\n"
        "```"
    )
    payload = _extract_json_payload(response_text)
    assert payload["remediated_code"] == "public class CleanApp {}"
    assert payload["projected_score"] == 100
    assert len(payload["changelog"]) == 2


