"""
Tests for the Security Vulnerability Agent.

Each vulnerable-code test targets exactly ONE rule at a time so a failure
tells you precisely which detector broke -- same testing philosophy as
test_code_analysis.py.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _scan(code: str) -> dict:
    response = client.post("/api/security-scan", data={"code": code})
    assert response.status_code == 200
    return response.json()


# --- Python rules ---

def test_python_eval_detected():
    body = _scan("def run(user_input):\n    return eval(user_input)\n")
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "CODE_EXECUTION_EVAL_EXEC" in rule_ids


def test_python_os_system_detected():
    body = _scan("import os\ndef run(cmd):\n    os.system(cmd)\n")
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "OS_COMMAND_INJECTION" in rule_ids


def test_python_subprocess_shell_true_detected():
    code = "import subprocess\ndef run(cmd):\n    subprocess.run(cmd, shell=True)\n"
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "SHELL_INJECTION_SUBPROCESS" in rule_ids


def test_python_pickle_loads_detected():
    body = _scan("import pickle\ndef run(data):\n    return pickle.loads(data)\n")
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "INSECURE_DESERIALIZATION" in rule_ids


def test_python_weak_hash_detected():
    body = _scan("import hashlib\ndef run(data):\n    return hashlib.md5(data).hexdigest()\n")
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "WEAK_HASH_ALGORITHM" in rule_ids


def test_python_disabled_tls_verification_detected():
    body = _scan("import requests\ndef run():\n    requests.get('https://x.com', verify=False)\n")
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "DISABLED_TLS_VERIFICATION" in rule_ids


def test_python_hardcoded_credential_detected():
    code = "def get_config():\n    API_KEY = \"sk-live-abc123\"\n    return API_KEY\n"
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "HARDCODED_CREDENTIALS" in rule_ids


def test_python_sql_injection_detected():
    # NOTE: detection is based on AST pattern matching at the .execute()
    # call site, not full data-flow analysis -- it catches concatenation
    # INLINE in the execute() call, but not "built the string one line
    # earlier, then passed the variable in." See Decision Log for the
    # accepted scope boundary this reflects.
    code = (
        "def run(cursor, username):\n"
        "    cursor.execute(\"SELECT * FROM users WHERE username = '\" + username + \"'\")\n"
    )
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "SQL_INJECTION_CONCAT" in rule_ids


def test_python_clean_code_zero_findings():
    code = (
        "def add(a: int, b: int) -> int:\n"
        "    return a + b\n"
    )
    body = _scan(code)
    assert body["findings"] == []
    assert body["summary"]["total_findings"] == 0
    assert body["overall_severity"] == "low"


# --- Java rules ---

def test_java_runtime_exec_detected():
    code = (
        "public class Main {\n"
        "    public static void main(String[] args) throws Exception {\n"
        "        Runtime.getRuntime().exec(args[0]);\n"
        "    }\n"
        "}\n"
    )
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "COMMAND_INJECTION_RUNTIME_EXEC" in rule_ids


def test_java_weak_hash_detected():
    code = (
        "import java.security.MessageDigest;\n"
        "public class Main {\n"
        "    public static void main(String[] args) throws Exception {\n"
        '        MessageDigest md = MessageDigest.getInstance("MD5");\n'
        "    }\n"
        "}\n"
    )
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "WEAK_HASH_ALGORITHM" in rule_ids


def test_java_insecure_random_detected():
    code = (
        "import java.util.Random;\n"
        "public class Main {\n"
        "    public static void main(String[] args) {\n"
        "        Random random = new Random();\n"
        "    }\n"
        "}\n"
    )
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "INSECURE_RANDOMNESS" in rule_ids


def test_java_hardcoded_credential_detected():
    code = (
        "public class Main {\n"
        '    private static final String password = "admin123";\n'
        "}\n"
    )
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "HARDCODED_CREDENTIALS" in rule_ids


def test_java_sql_injection_detected():
    code = (
        "public class Main {\n"
        "    public void run(java.sql.Statement stmt, String username) throws Exception {\n"
        '        stmt.executeQuery("SELECT * FROM users WHERE username = \'" + username + "\'");\n'
        "    }\n"
        "}\n"
    )
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "SQL_INJECTION_CONCAT" in rule_ids


def test_java_clean_code_zero_findings():
    code = (
        "public class Main {\n"
        "    public int add(int a, int b) {\n"
        "        return a + b;\n"
        "    }\n"
        "}\n"
    )
    body = _scan(code)
    assert body["findings"] == []
    assert body["overall_severity"] == "low"


def test_python_xss_render_template_string_detected():
    code = "from flask import render_template_string\ndef view(user_input):\n    return render_template_string('<h1>Hello ' + user_input + '</h1>')\n"
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "CROSS_SITE_SCRIPTING_XSS" in rule_ids


def test_python_csrf_exempt_detected():
    code = "from django.views.decorators.csrf import csrf_exempt\n@csrf_exempt\ndef transfer_money(request):\n    pass\n"
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "CSRF_PROTECTION_DISABLED" in rule_ids


def test_python_insecure_cookie_detected():
    code = "def set_user_cookie(response):\n    response.set_cookie('session_id', '12345', httponly=False, secure=False)\n"
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "INSECURE_COOKIE_ATTRIBUTES" in rule_ids


def test_python_broken_access_control_detected():
    code = "@app.route('/admin/delete_user', methods=['POST'])\ndef delete_user():\n    pass\n"
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "BROKEN_ACCESS_CONTROL_MISSING_AUTH" in rule_ids


def test_java_xss_detected():
    code = (
        "import javax.servlet.http.HttpServletResponse;\n"
        "public class Main {\n"
        "    public void serve(HttpServletResponse response, String user) throws Exception {\n"
        '        response.getWriter().write("<div>Hello " + user + "</div>");\n'
        "    }\n"
        "}\n"
    )
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "CROSS_SITE_SCRIPTING_XSS" in rule_ids


def test_java_csrf_disabled_detected():
    code = (
        "public class SecurityConfig {\n"
        "    public void configure(org.springframework.security.config.annotation.web.builders.HttpSecurity http) throws Exception {\n"
        "        http.csrf().disable();\n"
        "    }\n"
        "}\n"
    )
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "CSRF_PROTECTION_DISABLED" in rule_ids


def test_java_insecure_cookie_detected():
    code = (
        "import javax.servlet.http.Cookie;\n"
        "public class CookieHelper {\n"
        "    public void makeCookie(Cookie cookie) {\n"
        "        cookie.setHttpOnly(false);\n"
        "    }\n"
        "}\n"
    )
    body = _scan(code)
    rule_ids = [f["rule_id"] for f in body["findings"]]
    assert "INSECURE_COOKIE_ATTRIBUTES" in rule_ids


def test_scan_invalid_syntax_returns_422():
    response = client.post("/api/security-scan", data={"code": "def foo(:\n"})
    assert response.status_code == 422


def test_scan_no_input_returns_400():
    response = client.post("/api/security-scan", data={})
    assert response.status_code == 400

