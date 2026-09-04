"""
Unit and integration tests for Multi-File ZIP Archive Security Analysis.
"""

import io
import zipfile
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_SAMPLE_PY_VULN = """
import sqlite3

def get_user(user_id):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")
    return cursor.fetchall()
"""

_SAMPLE_JAVA_VULN = """
public class PaymentController {
    public void executeCmd(String cmd) throws Exception {
        Runtime.getRuntime().exec(cmd);
    }
}
"""

_SAMPLE_PY_CLEAN = """
def add_numbers(a: int, b: int) -> int:
    \"\"\"Calculates sum of two integers safely.\"\"\"
    return a + b
"""


def _create_test_zip(files_dict: dict) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for path, content in files_dict.items():
            zf.writestr(path, content)
    buffer.seek(0)
    return buffer.getvalue()


def test_zip_review_valid_python_and_java():
    files = {
        "src/auth/login.py": _SAMPLE_PY_VULN,
        "src/controllers/PaymentController.java": _SAMPLE_JAVA_VULN,
        "src/utils/math.py": _SAMPLE_PY_CLEAN,
        "README.md": "# Project Readme",  # Should be skipped
        "node_modules/dummy.py": _SAMPLE_PY_VULN,  # Should be ignored
    }
    zip_bytes = _create_test_zip(files)

    response = client.post(
        "/api/review-zip",
        files={"file": ("project.zip", zip_bytes, "application/zip")},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["archive_name"] == "project.zip"
    assert data["summary"]["total_files_scanned"] == 3
    assert data["summary"]["python_files_count"] == 2
    assert data["summary"]["java_files_count"] == 1
    assert data["summary"]["total_findings"] >= 2
    assert len(data["files"]) == 3
    assert any("README.md" in s for s in data["skipped_files"])


def test_zip_review_rejects_non_zip_file():
    response = client.post(
        "/api/review-zip",
        files={"file": ("malicious.txt", b"plain text", "text/plain")},
    )
    assert response.status_code == 400
    assert "must be a .zip archive" in response.json()["detail"]


def test_zip_review_rejects_empty_zip():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED):
        pass
    buffer.seek(0)

    response = client.post(
        "/api/review-zip",
        files={"file": ("empty.zip", buffer.getvalue(), "application/zip")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_zip_review_no_supported_files():
    files = {
        "index.html": "<h1>Hello</h1>",
        "styles.css": "body { color: red; }",
    }
    zip_bytes = _create_test_zip(files)

    response = client.post(
        "/api/review-zip",
        files={"file": ("web_app.zip", zip_bytes, "application/zip")},
    )
    assert response.status_code == 400
    assert "No Python (.py) or Java (.java) source files were found" in response.json()["detail"]


def test_zip_review_rejects_zip_slip_path_traversal():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as zf:
        zf.writestr("../../etc/evil.py", _SAMPLE_PY_VULN)
    buffer.seek(0)

    response = client.post(
        "/api/review-zip",
        files={"file": ("slip.zip", buffer.getvalue(), "application/zip")},
    )
    assert response.status_code == 400
    assert "path traversal" in response.json()["detail"].lower()


def test_zip_review_handles_syntax_error_in_one_file():
    files = {
        "src/valid.py": _SAMPLE_PY_CLEAN,
        "src/broken.py": "def broken_func(:\n    pass",
    }
    zip_bytes = _create_test_zip(files)

    response = client.post(
        "/api/review-zip",
        files={"file": ("mixed.zip", zip_bytes, "application/zip")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_files_scanned"] == 2

    broken_file = next(f for f in data["files"] if "broken.py" in f["file_path"])
    assert broken_file["syntax_error"] is not None
    assert broken_file["health_score"] == 0


def test_zip_review_windows_txt_document_handling():
    files = {
        "auth_controller.py.txt": _SAMPLE_PY_VULN,
        "CryptoHandler.java.txt": _SAMPLE_JAVA_VULN,
    }
    zip_bytes = _create_test_zip(files)

    response = client.post(
        "/api/review-zip",
        files={"file": ("Multi sample.zip", zip_bytes, "application/zip")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_files_scanned"] == 2
    assert data["summary"]["python_files_count"] == 1
    assert data["summary"]["java_files_count"] == 1
    assert any("auth_controller.py" in f["file_path"] for f in data["files"])
    assert any("CryptoHandler.java" in f["file_path"] for f in data["files"])

