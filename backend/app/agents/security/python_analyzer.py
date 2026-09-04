"""
Python Security Vulnerability Analyzer.

Uses Python's built-in `ast` module -- the SAME approach as the Code
Analysis Agent's python_analyzer.py, and for the same reason: static
analysis of the syntax tree, never executing the submitted code. This
matters even more here than in Code Analysis, since we are specifically
scanning code that may itself be malicious.

Each rule maps to an OWASP Top 10 (2021) category -- see
knowledge-base/documents/owasp_top10.md for the underlying reference
material these rules are grounded in.
"""

import ast
import re

from app.agents.security.external_scanners import run_bandit, run_semgrep
from app.agents.security.severity import RULE_SEVERITY
from app.models.security_schema import SecurityScanReport, SecuritySummary, VulnerabilityFinding
from app.agents.security.severity import compute_overall_severity

# Variable/field names that suggest a hardcoded secret when assigned a
# string literal. Intentionally broad -- false positives here are far
# cheaper than false negatives for a security scanner.
_SECRET_NAME_PATTERN = re.compile(
    r"(password|secret|api[_-]?key|token|passwd|credential|private[_-]?key|bearer|auth[_-]?token|jwt[_-]?secret|access[_-]?token|client[_-]?secret)",
    re.IGNORECASE,
)


def _get_line_snippet(code_lines: list[str], lineno: int | None) -> str | None:
    if lineno is None or lineno < 1 or lineno > len(code_lines):
        return None
    return code_lines[lineno - 1].strip()


def analyze_python(code: str) -> SecurityScanReport:
    tree = ast.parse(code)
    code_lines = code.splitlines()
    findings: list[VulnerabilityFinding] = []

    def add_finding(rule_id: str, owasp_category: str, title: str, description: str, node: ast.AST) -> None:
        lineno = getattr(node, "lineno", None)
        findings.append(VulnerabilityFinding(
            owasp_category=owasp_category,
            rule_id=rule_id,
            title=title,
            description=description,
            severity=RULE_SEVERITY[rule_id],
            line=lineno,
            code_snippet=_get_line_snippet(code_lines, lineno),
        ))

    for node in ast.walk(tree):
        # --- eval() / exec() : arbitrary code execution ---
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in ("eval", "exec"):
            add_finding(
                "CODE_EXECUTION_EVAL_EXEC", "A03:2021 - Injection",
                f"Use of {node.func.id}()",
                f"'{node.func.id}()' executes arbitrary code from its argument. If any part of "
                f"that argument originates from user input, this is equivalent to full remote "
                f"code execution. Use 'ast.literal_eval()' if only parsing literal data structures.",
                node,
            )

        # --- os.system() : OS command injection ---
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == "system" and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "os"):
            add_finding(
                "OS_COMMAND_INJECTION", "A03:2021 - Injection",
                "OS Command Injection via os.system()",
                "'os.system()' passes its argument directly to the shell. If any part of the "
                "command string is influenced by user input, an attacker can inject arbitrary "
                "shell commands. Use 'subprocess.run()' with a list of arguments (no shell=True) instead.",
                node,
            )

        # --- subprocess.*(..., shell=True) ---
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and isinstance(node.func.value, ast.Name) and node.func.value.id == "subprocess"
                and node.func.attr in ("run", "call", "Popen", "check_output")):
            for kw in node.keywords:
                if kw.arg == "shell" and isinstance(kw.value, ast.Constant) and kw.value.value is True:
                    add_finding(
                        "SHELL_INJECTION_SUBPROCESS", "A03:2021 - Injection",
                        "Shell Injection via subprocess(shell=True)",
                        "Calling subprocess with 'shell=True' invokes a system shell, allowing "
                        "shell metacharacters in the command to be interpreted -- dangerous if any "
                        "part of the command includes user input. Pass the command as a list of "
                        "arguments and omit 'shell=True'.",
                        node,
                    )

        # --- pickle.loads() : insecure deserialization ---
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == "loads" and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "pickle"):
            add_finding(
                "INSECURE_DESERIALIZATION", "A08:2021 - Software and Data Integrity Failures",
                "Insecure Deserialization via pickle.loads()",
                "'pickle.loads()' can reconstruct arbitrary Python objects, including ones that "
                "execute code as a side effect of deserialization. Never unpickle data from an "
                "untrusted source; use 'json' for data interchange instead.",
                node,
            )

        # --- hashlib.md5() / hashlib.sha1() : weak hash algorithm ---
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr in ("md5", "sha1") and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "hashlib"):
            add_finding(
                "WEAK_HASH_ALGORITHM", "A02:2021 - Cryptographic Failures",
                f"Weak Hash Algorithm ({node.func.attr.upper()})",
                f"'{node.func.attr}' is cryptographically broken and unsuitable for password "
                f"hashing or integrity verification against a malicious actor. Use 'bcrypt', "
                f"'scrypt', or 'hashlib.sha256'/'sha3_256' depending on the use case.",
                node,
            )

        # --- verify=False : disabled TLS certificate verification ---
        if isinstance(node, ast.Call):
            for kw in node.keywords:
                if kw.arg == "verify" and isinstance(kw.value, ast.Constant) and kw.value.value is False:
                    add_finding(
                        "DISABLED_TLS_VERIFICATION", "A02:2021 - Cryptographic Failures",
                        "Disabled TLS Certificate Verification",
                        "Setting 'verify=False' disables TLS certificate validation, making the "
                        "connection vulnerable to man-in-the-middle attacks. Never disable "
                        "verification in production code.",
                        node,
                    )

        # --- Hardcoded credentials: NAME = "literal string" ---
        if isinstance(node, ast.Assign):
            for target in node.targets:
                name = None
                if isinstance(target, ast.Name):
                    name = target.id
                elif isinstance(target, ast.Attribute):
                    name = target.attr
                if name and _SECRET_NAME_PATTERN.search(name) and isinstance(node.value, ast.Constant) \
                        and isinstance(node.value.value, str) and node.value.value:
                    add_finding(
                        "HARDCODED_CREDENTIALS", "A07:2021 - Identification and Authentication Failures",
                        "Hardcoded Credential",
                        f"'{name}' appears to hold a secret value hardcoded directly in source code. "
                        f"Hardcoded credentials are a critical risk in shared/public repositories. "
                        f"Load secrets from environment variables or a secrets manager instead.",
                        node,
                    )

        # --- SQL Injection: execute(<string concatenation or f-string>) ---
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == "execute" and node.args):
            first_arg = node.args[0]
            if isinstance(first_arg, ast.BinOp) or isinstance(first_arg, ast.JoinedStr):
                add_finding(
                    "SQL_INJECTION_CONCAT", "A03:2021 - Injection",
                    "SQL Injection via String Concatenation",
                    "A query string built with '+' concatenation or an f-string, then passed to "
                    "'.execute()', allows attacker-controlled input to alter the query's structure. "
                    "Use parameterized queries: 'cursor.execute(query, (param,))' instead.",
                    node,
                )

        # --- Cross-Site Scripting (XSS): render_template_string / mark_safe / Markup ---
        if isinstance(node, ast.Call):
            func_name = None
            if isinstance(node.func, ast.Name):
                func_name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                func_name = node.func.attr

            if func_name in ("render_template_string", "mark_safe", "Markup") and node.args:
                arg = node.args[0]
                if isinstance(arg, (ast.BinOp, ast.JoinedStr, ast.Name, ast.Call)):
                    add_finding(
                        "CROSS_SITE_SCRIPTING_XSS", "A03:2021 - Injection",
                        f"Cross-Site Scripting (XSS) via {func_name}()",
                        f"Passing dynamically formatted or unescaped strings to '{func_name}()' can render "
                        f"untrusted user input as executable HTML/JavaScript in the browser. "
                        f"Use safe template rendering (render_template) or explicit HTML entity escaping.",
                        node,
                    )

        # --- CSRF Protection Disabled: @csrf_exempt decorator ---
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for decorator in node.decorator_list:
                dec_name = None
                if isinstance(decorator, ast.Name):
                    dec_name = decorator.id
                elif isinstance(decorator, ast.Attribute):
                    dec_name = decorator.attr
                if dec_name == "csrf_exempt":
                    add_finding(
                        "CSRF_PROTECTION_DISABLED", "A01:2021 - Broken Access Control",
                        "CSRF Protection Disabled (@csrf_exempt)",
                        f"Function '{node.name}' uses the '@csrf_exempt' decorator, disabling CSRF token "
                        f"validation. State-changing endpoints without CSRF protection allow attackers "
                        f"to perform unauthorized actions on behalf of authenticated users.",
                        node,
                    )

        # --- Insecure Cookie Configuration: httponly=False or secure=False ---
        if isinstance(node, ast.Call):
            is_cookie_call = False
            if isinstance(node.func, ast.Attribute) and node.func.attr == "set_cookie":
                is_cookie_call = True
            elif isinstance(node.func, ast.Name) and node.func.id == "set_cookie":
                is_cookie_call = True

            if is_cookie_call:
                insecure_flags = []
                for kw in node.keywords:
                    if kw.arg == "httponly" and isinstance(kw.value, ast.Constant) and kw.value.value is False:
                        insecure_flags.append("httponly=False")
                    if kw.arg == "secure" and isinstance(kw.value, ast.Constant) and kw.value.value is False:
                        insecure_flags.append("secure=False")
                    if kw.arg == "samesite" and isinstance(kw.value, ast.Constant) and str(kw.value.value).lower() in ("none", "none"):
                        insecure_flags.append("samesite='None'")
                if insecure_flags:
                    add_finding(
                        "INSECURE_COOKIE_ATTRIBUTES", "A07:2021 - Identification and Authentication Failures",
                        "Insecure Cookie Configuration",
                        f"Cookie is configured with insecure flag(s): {', '.join(insecure_flags)}. "
                        f"Cookies without 'httponly=True' can be stolen via XSS, and cookies without "
                        f"'secure=True' can be intercepted over unencrypted HTTP.",
                        node,
                    )

        # --- Broken Access Control: Sensitive Route Missing Authentication ---
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            has_route_decorator = False
            is_sensitive_path = False
            has_auth_check = False
            for dec in node.decorator_list:
                dec_str = ast.dump(dec)
                if any(r in dec_str for r in ("route", "get", "post", "put", "delete")):
                    has_route_decorator = True
                    if any(p in dec_str.lower() for p in ("/admin", "/delete", "/update", "/role", "/permission")):
                        is_sensitive_path = True
                if any(a in dec_str.lower() for a in ("login_required", "auth", "permission_required", "depends", "roles_accepted")):
                    has_auth_check = True

            if has_route_decorator and is_sensitive_path and not has_auth_check:
                add_finding(
                    "BROKEN_ACCESS_CONTROL_MISSING_AUTH", "A01:2021 - Broken Access Control",
                    f"Sensitive Endpoint Missing Access Control in '{node.name}'",
                    f"Endpoint '{node.name}' handles a privileged administrative path but lacks an explicit "
                    f"authentication/authorization guard (e.g. @login_required, Depends, or permission checks).",
                    node,
                )

    # --- External tool integration: Bandit + Semgrep ---
    # Our own AST rules above only catch the specific patterns we
    # explicitly coded for. Bandit and Semgrep bring hundreds of
    # additional, professionally-maintained security rules -- run
    # alongside (not replacing) our custom rules to broaden coverage
    # without discarding already-tested detection logic.
    findings.extend(run_bandit(code))
    findings.extend(run_semgrep(code, "python"))

    summary = SecuritySummary(
        total_findings=len(findings),
        critical=sum(1 for f in findings if f.severity.value == "critical"),
        high=sum(1 for f in findings if f.severity.value == "high"),
        medium=sum(1 for f in findings if f.severity.value == "medium"),
        low=sum(1 for f in findings if f.severity.value == "low"),
    )

    return SecurityScanReport(
        language="python",
        findings=findings,
        summary=summary,
        overall_severity=compute_overall_severity(findings),
    )
