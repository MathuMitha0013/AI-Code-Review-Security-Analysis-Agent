"""
Tests for the Code Analysis Agent.

Strategy: craft small code samples that DELIBERATELY trigger each rule,
then assert the expected finding appears. This is more valuable than
testing against "real" code, because we know exactly what SHOULD be
detected — false negatives are immediately obvious.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _analyze(code: str) -> dict:
    response = client.post("/api/analyze", data={"code": code})
    assert response.status_code == 200
    return response.json()


def test_invalid_syntax_skips_analysis() -> None:
    body = _analyze("def foo(:\n    pass")
    assert body["is_valid"] is False
    assert body["findings"] == []


def test_clean_python_code_has_no_findings() -> None:
    code = "def add(a, b):\n    return a + b\n"
    body = _analyze(code)
    assert body["is_valid"] is True
    assert body["summary"]["total_findings"] == 0


def test_python_long_method_detected() -> None:
    long_body = "\n".join([f"    x{i} = {i}" for i in range(60)])
    code = f"def big_function():\n{long_body}\n    return x0\n"
    body = _analyze(code)
    rules = [f["rule"] for f in body["findings"]]
    assert "LONG_METHOD" in rules


def test_python_too_many_parameters_detected() -> None:
    code = "def many_params(a, b, c, d, e, f, g, h):\n    return a\n"
    body = _analyze(code)
    rules = [f["rule"] for f in body["findings"]]
    assert "TOO_MANY_PARAMETERS" in rules


def test_python_deep_nesting_detected() -> None:
    code = (
        "def nested():\n"
        "    if True:\n"
        "        if True:\n"
        "            if True:\n"
        "                if True:\n"
        "                    return 1\n"
    )
    body = _analyze(code)
    rules = [f["rule"] for f in body["findings"]]
    assert "DEEP_NESTING" in rules


def test_python_high_complexity_detected() -> None:
    branches = "\n".join([f"    if x == {i}:\n        return {i}" for i in range(12)])
    code = f"def branchy(x):\n{branches}\n    return -1\n"
    body = _analyze(code)
    rules = [f["rule"] for f in body["findings"]]
    assert "HIGH_CYCLOMATIC_COMPLEXITY" in rules


def test_python_god_object_detected() -> None:
    methods = "\n".join([f"    def method_{i}(self):\n        pass\n" for i in range(12)])
    code = f"class BigClass:\n{methods}"
    body = _analyze(code)
    rules = [f["rule"] for f in body["findings"]]
    assert "GOD_OBJECT" in rules


def test_python_naming_convention_detected() -> None:
    code = "def BadlyNamedFunction():\n    return 1\n"
    body = _analyze(code)
    rules = [f["rule"] for f in body["findings"]]
    assert "NAMING_CONVENTION_VIOLATION" in rules


def test_java_clean_code_has_no_findings() -> None:
    code = (
        "public class Calculator {\n"
        "    public int add(int a, int b) {\n"
        "        return a + b;\n"
        "    }\n"
        "}\n"
    )
    body = _analyze(code)
    assert body["is_valid"] is True
    assert body["summary"]["total_findings"] == 0


def test_java_too_many_parameters_detected() -> None:
    code = (
        "public class Main {\n"
        "    public int sum(int a, int b, int c, int d, int e, int f, int g, int h) {\n"
        "        return a;\n"
        "    }\n"
        "}\n"
    )
    body = _analyze(code)
    rules = [f["rule"] for f in body["findings"]]
    assert "TOO_MANY_PARAMETERS" in rules


def test_java_high_complexity_detected() -> None:
    branches = "\n".join(
        [f"        if (x == {i}) {{ return {i}; }}" for i in range(12)]
    )
    code = (
        "public class Main {\n"
        "    public int branchy(int x) {\n"
        f"{branches}\n"
        "        return -1;\n"
        "    }\n"
        "}\n"
    )
    body = _analyze(code)
    rules = [f["rule"] for f in body["findings"]]
    assert "HIGH_CYCLOMATIC_COMPLEXITY" in rules


def test_java_god_object_detected() -> None:
    methods = "\n".join([f"    public void method{i}() {{}}\n" for i in range(12)])
    code = f"public class BigClass {{\n{methods}}}\n"
    body = _analyze(code)
    rules = [f["rule"] for f in body["findings"]]
    assert "GOD_OBJECT" in rules


def test_analyze_no_input_returns_400() -> None:
    response = client.post("/api/analyze", data={})
    assert response.status_code == 400
