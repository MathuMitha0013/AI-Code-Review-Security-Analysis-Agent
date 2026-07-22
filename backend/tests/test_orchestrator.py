"""
Tests for the Orchestrator (/api/review).

Focus: does the MERGE behave correctly (both agents' findings present,
sorted by severity, summary counts correct) -- not re-testing each
individual agent's detection rules, which already have their own test
files (test_code_analysis.py, test_security_agent.py).
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _review(code: str) -> dict:
    response = client.post("/api/review", data={"code": code})
    assert response.status_code == 200
    return response.json()


def test_review_clean_code_zero_findings():
    code = "def add(a: int, b: int) -> int:\n    return a + b\n"
    body = _review(code)
    assert body["findings"] == []
    assert body["overall_severity"] == "low"
    assert body["summary"]["code_analysis_findings"] == 0
    assert body["summary"]["security_findings"] == 0


def test_review_combines_findings_from_both_agents():
    """
    This function triggers BOTH a Code Analysis finding (too many
    parameters) AND a Security finding (eval usage) -- confirming the
    orchestrator actually dispatches to and merges from both agents,
    not just one.
    """
    code = (
        "def run(a, b, c, d, e, f, user_input):\n"
        "    return eval(user_input)\n"
    )
    body = _review(code)

    source_agents = {f["source_agent"] for f in body["findings"]}
    assert "code_analysis" in source_agents
    assert "security" in source_agents

    assert body["summary"]["code_analysis_findings"] >= 1
    assert body["summary"]["security_findings"] >= 1
    assert body["summary"]["total_findings"] == len(body["findings"])


def test_review_prioritizes_by_severity_descending():
    """The eval() finding is CRITICAL; the too-many-params finding is LOW.
    Confirm the merged list is sorted most-severe-first."""
    code = (
        "def run(a, b, c, d, e, f, user_input):\n"
        "    return eval(user_input)\n"
    )
    body = _review(code)
    severities = [f["severity"] for f in body["findings"]]
    rank = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    ranked = [rank[s] for s in severities]
    assert ranked == sorted(ranked, reverse=True)


def test_review_overall_severity_matches_highest_finding():
    code = "def run(user_input):\n    return eval(user_input)\n"
    body = _review(code)
    assert body["overall_severity"] == "critical"


def test_review_summary_counts_are_consistent():
    code = "def run(a, b, c, d, e, f, user_input):\n    return eval(user_input)\n"
    body = _review(code)
    s = body["summary"]
    assert s["total_findings"] == s["critical"] + s["high"] + s["medium"] + s["low"]


def test_review_invalid_syntax_returns_422():
    response = client.post("/api/review", data={"code": "def foo(:\n"})
    assert response.status_code == 422


def test_review_no_input_returns_400():
    response = client.post("/api/review", data={})
    assert response.status_code == 400


def test_review_both_inputs_returns_400(tmp_path):
    file_path = tmp_path / "test.py"
    file_path.write_text("print('hi')")
    with open(file_path, "rb") as f:
        response = client.post(
            "/api/review",
            data={"code": "print('hi')"},
            files={"file": ("test.py", f, "text/plain")},
        )
    assert response.status_code == 400
