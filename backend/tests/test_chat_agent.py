"""
Tests for the Conversational Code Assistant (RAG Chatbot - Milestone 3).

Mocks both the local ChromaDB vector store and the external Groq API
to verify prompt generation, citation mappings, history integration,
and failure responses in isolation.
"""

from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_SAMPLE_CHAT_REQUEST = {
    "message": "How do I secure this query against SQL Injection?",
    "finding_title": "SQL Injection via Concatenation",
    "code_snippet": "query = 'SELECT * FROM users WHERE id = ' + user_id",
    "history": [
        {"role": "user", "content": "Hello Assistant"},
        {"role": "assistant", "content": "Hello! I am your secure coding mentor. How can I help you today?"}
    ]
}


def test_chat_without_api_key_returns_503(monkeypatch):
    """If GROQ_API_KEY is not defined, return a 503 Service Unavailable."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")

    # Inject mock database client to bypass startup checks
    app.state.vector_store = MagicMock()

    response = client.post("/api/chat", json=_SAMPLE_CHAT_REQUEST)
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]


def test_chat_success_with_mocked_rag_and_groq(monkeypatch):
    """Verifies that vector search executes, prompt formatting occurs, and replies return successfully."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", "fake-key-for-testing")

    # 1. Mock ChromaDB vector store search results
    mock_doc = MagicMock()
    mock_doc.page_content = "Always use parameterized queries (prepared statements) to isolate code from user parameters."
    mock_doc.metadata = {"source": "C:\\docs\\SQL_Injection_Prevention_Cheat_Sheet.pdf", "page": 1}
    
    mock_vector_store = MagicMock()
    mock_vector_store.similarity_search.return_value = [mock_doc]
    app.state.vector_store = mock_vector_store

    # 2. Mock Groq API response
    mock_reply = "To secure this query, you should replace the concatenation with a parameterized SQL statement."
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock(message=MagicMock(content=mock_reply))]

    with patch("app.api.chat.OpenAI") as MockOpenAI:
        mock_client_instance = MockOpenAI.return_value
        mock_client_instance.chat.completions.create.return_value = mock_groq_response

        response = client.post("/api/chat", json=_SAMPLE_CHAT_REQUEST)

    # 3. Assert results
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == mock_reply
    assert len(body["sources"]) == 1
    assert body["sources"][0]["source"] == "SQL_Injection_Prevention_Cheat_Sheet.pdf"
    assert body["sources"][0]["page"] == 2  # 0-indexed 1 converted to 1-indexed 2


def test_chat_groq_failure_returns_502(monkeypatch):
    """If Groq service drops, return a 502 Bad Gateway error."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "GROQ_API_KEY", "fake-key-for-testing")

    mock_vector_store = MagicMock()
    mock_vector_store.similarity_search.return_value = []
    app.state.vector_store = mock_vector_store

    with patch("app.api.chat.OpenAI") as MockOpenAI:
        mock_client_instance = MockOpenAI.return_value
        mock_client_instance.chat.completions.create.side_effect = Exception("Service unavailable")

        response = client.post("/api/chat", json=_SAMPLE_CHAT_REQUEST)

    assert response.status_code == 502
    assert "LLM service" in response.json()["detail"]


def test_chat_missing_fields_returns_422():
    """Verify input validation gates malformed requests before contacting LLM."""
    response = client.post("/api/chat", json={"finding_title": "Missing message field"})
    assert response.status_code == 422
