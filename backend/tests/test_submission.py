"""
Tests for the Submission Module.

Why test at the API layer (using TestClient) instead of only unit-testing
services directly?
    These tests verify the FULL request/response contract — exactly what
    the frontend (and future agents) will actually experience. Service-level
    unit tests are still valuable and can be added alongside these later,
    but integration tests like these catch issues unit tests miss (e.g.,
    wrong status code, malformed JSON response).
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_valid_python_paste() -> None:
    response = client.post("/api/submit", data={"code": "def foo():\n    return 1\n"})
    assert response.status_code == 200
    body = response.json()
    assert body["language"] == "python"
    assert body["is_valid"] is True
    assert body["error"] is None


def test_invalid_python_paste() -> None:
    response = client.post("/api/submit", data={"code": "def foo(:\n    return 1\n"})
    assert response.status_code == 200
    body = response.json()
    assert body["language"] == "python"
    assert body["is_valid"] is False
    assert "SyntaxError" in body["error"]


def test_valid_java_paste() -> None:
    java_code = (
        "public class Main {\n"
        "    public static void main(String[] args) {\n"
        '        System.out.println("Hello");\n'
        "    }\n"
        "}\n"
    )
    response = client.post("/api/submit", data={"code": java_code})
    assert response.status_code == 200
    body = response.json()
    assert body["language"] == "java"
    assert body["is_valid"] is True


def test_invalid_java_paste() -> None:
    java_code = "public class Main {\n    public static void main(String[] args) {\n"  # missing closing braces
    response = client.post("/api/submit", data={"code": java_code})
    assert response.status_code == 200
    body = response.json()
    assert body["language"] == "java"
    assert body["is_valid"] is False


def test_no_input_returns_400() -> None:
    response = client.post("/api/submit", data={})
    assert response.status_code == 400


def test_both_inputs_returns_400(tmp_path) -> None:
    file_path = tmp_path / "test.py"
    file_path.write_text("print('hi')")
    with open(file_path, "rb") as f:
        response = client.post(
            "/api/submit",
            data={"code": "print('hi')"},
            files={"file": ("test.py", f, "text/plain")},
        )
    assert response.status_code == 400
