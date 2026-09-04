"""
Java Security Vulnerability Analyzer.

Uses `javalang` -- the same parser as Milestone 1's syntax validation and
the Code Analysis Agent's Java analyzer, keeping a single, consistent
Java parsing dependency across the whole backend rather than introducing
a second Java AST library.
"""

import re

import javalang

from app.agents.security.external_scanners import run_semgrep
from app.agents.security.severity import RULE_SEVERITY, compute_overall_severity
from app.models.security_schema import SecurityScanReport, SecuritySummary, VulnerabilityFinding

_SECRET_NAME_PATTERN = re.compile(r"(password|secret|api[_-]?key|token|passwd|credential)", re.IGNORECASE)
_WEAK_HASH_ALGORITHMS = {"MD5", "SHA1", "SHA-1"}


def _get_line_snippet(code_lines: list[str], lineno: int | None) -> str | None:
    if lineno is None or lineno < 1 or lineno > len(code_lines):
        return None
    return code_lines[lineno - 1].strip()


def analyze_java(code: str) -> SecurityScanReport:
    tree = javalang.parse.parse(code)
    code_lines = code.splitlines()
    findings: list[VulnerabilityFinding] = []

    def add_finding(rule_id: str, owasp_category: str, title: str, description: str, position) -> None:
        lineno = position.line if position else None
        findings.append(VulnerabilityFinding(
            owasp_category=owasp_category,
            rule_id=rule_id,
            title=title,
            description=description,
            severity=RULE_SEVERITY[rule_id],
            line=lineno,
            code_snippet=_get_line_snippet(code_lines, lineno),
        ))

    # --- Method invocations: Runtime.exec, ObjectInputStream deserialization,
    #     weak hashing, string-concatenated SQL execution ---
    for _, node in tree.filter(javalang.tree.MethodInvocation):
        qualifier = node.qualifier or ""
        member = node.member

        # Runtime.exec(...) — OS command injection.
        # NOTE: javalang represents chained calls like
        # `Runtime.getRuntime().exec(...)` as two separate MethodInvocation
        # nodes -- exec()'s own `qualifier` is None (it's chained off the
        # previous call's result, not a plain qualified name). We can't
        # reliably confirm the receiver is a Runtime instance from this
        # node alone, so we flag any `exec(...)` call with an argument as
        # a heuristic match. Accepted trade-off: possible false positives
        # on unrelated `exec()` methods from other classes, documented in
        # the Decision Log.
        if member == "exec" and node.arguments:
            add_finding(
                "COMMAND_INJECTION_RUNTIME_EXEC", "A03:2021 - Injection",
                "Possible OS Command Injection via exec()",
                "An 'exec(...)' call was found. If this is 'Runtime.getRuntime().exec()', it "
                "executes its argument as an OS command -- if any part of the command originates "
                "from user input, this allows arbitrary command execution. Verify the receiver "
                "and avoid shelling out to OS commands with user-controlled input.",
                node.position,
            )

        # MessageDigest.getInstance("MD5" / "SHA1") — weak hash
        if member == "getInstance" and "MessageDigest" in qualifier and node.arguments:
            arg = node.arguments[0]
            if isinstance(arg, javalang.tree.Literal) and any(
                alg in (arg.value or "") for alg in _WEAK_HASH_ALGORITHMS
            ):
                add_finding(
                    "WEAK_HASH_ALGORITHM", "A02:2021 - Cryptographic Failures",
                    "Weak Hash Algorithm",
                    "MD5 and SHA-1 are cryptographically broken and unsuitable for password "
                    "hashing or integrity verification against a malicious actor. Use SHA-256 "
                    "or a dedicated password-hashing algorithm (bcrypt, Argon2) instead.",
                    node.position,
                )

        # Statement.execute / executeQuery / executeUpdate with string-concatenated argument
        if member in ("execute", "executeQuery", "executeUpdate") and node.arguments:
            arg = node.arguments[0]
            if isinstance(arg, javalang.tree.BinaryOperation) and arg.operator == "+":
                add_finding(
                    "SQL_INJECTION_CONCAT", "A03:2021 - Injection",
                    "SQL Injection via String Concatenation",
                    "A query string built with '+' concatenation, then passed to a Statement "
                    "execute method, allows attacker-controlled input to alter the query's "
                    "structure. Use 'PreparedStatement' with '?' placeholders instead.",
                    node.position,
                )

        # Cross-Site Scripting (XSS): response.getWriter().write(...) / println with concatenation
        if member in ("write", "print", "println") and node.arguments:
            arg = node.arguments[0]
            if isinstance(arg, javalang.tree.BinaryOperation) and arg.operator == "+":
                add_finding(
                    "CROSS_SITE_SCRIPTING_XSS", "A03:2021 - Injection",
                    "Cross-Site Scripting (XSS) via Unescaped Output",
                    "Writing dynamic string-concatenated content directly to the HTTP response stream "
                    "can render unescaped user input as executable script in the victim's browser. "
                    "Encode output using OWASP Java HTML encoder or use safe template engines.",
                    node.position,
                )

        # CSRF Protection Disabled: http.csrf().disable()
        if member == "disable" and (qualifier == "csrf" or "csrf()" in code):
            add_finding(
                "CSRF_PROTECTION_DISABLED", "A01:2021 - Broken Access Control",
                "CSRF Protection Disabled in Security Configuration",
                "Calling 'csrf().disable()' removes Cross-Site Request Forgery protections from Spring "
                "Security. State-changing requests become vulnerable to unauthorized forgery from malicious sites.",
                node.position,
            )

        # Insecure Cookie Attributes: setHttpOnly(false) or setSecure(false)
        if member in ("setHttpOnly", "setSecure") and node.arguments:
            arg = node.arguments[0]
            if isinstance(arg, javalang.tree.Literal) and str(arg.value).lower() == "false":
                flag_name = "HttpOnly" if member == "setHttpOnly" else "Secure"
                add_finding(
                    "INSECURE_COOKIE_ATTRIBUTES", "A07:2021 - Identification and Authentication Failures",
                    f"Insecure Cookie Flag ({flag_name}=false)",
                    f"Explicitly setting '{member}(false)' leaves cookies exposed to XSS script access or "
                    f"unencrypted transmission over HTTP.",
                    node.position,
                )

    # --- Object creation: new Random(), new ObjectInputStream(...) ---
    for _, node in tree.filter(javalang.tree.ClassCreator):
        type_name = node.type.name if node.type else ""

        if type_name == "Random":
            add_finding(
                "INSECURE_RANDOMNESS", "A02:2021 - Cryptographic Failures",
                "Insecure Randomness (java.util.Random)",
                "'java.util.Random' is not cryptographically secure and is predictable given "
                "enough output. For any security-sensitive value (tokens, session IDs, keys), "
                "use 'java.security.SecureRandom' instead.",
                node.position,
            )

        if type_name == "ObjectInputStream":
            add_finding(
                "INSECURE_DESERIALIZATION", "A08:2021 - Software and Data Integrity Failures",
                "Insecure Deserialization (ObjectInputStream)",
                "Deserializing data with 'ObjectInputStream.readObject()' on untrusted input is "
                "a well-known source of remote code execution via deserialization gadget chains. "
                "Prefer safe data formats (JSON via Jackson/Gson) for untrusted input.",
                node.position,
            )

    # --- Field and local variable declarations: hardcoded credentials ---
    for node_type in (javalang.tree.FieldDeclaration, javalang.tree.LocalVariableDeclaration):
        for _, node in tree.filter(node_type):
            for declarator in node.declarators:
                if (declarator.name and _SECRET_NAME_PATTERN.search(declarator.name)
                        and isinstance(declarator.initializer, javalang.tree.Literal)
                        and declarator.initializer.value
                        and declarator.initializer.value.startswith('"')):
                    add_finding(
                        "HARDCODED_CREDENTIALS", "A07:2021 - Identification and Authentication Failures",
                        "Hardcoded Credential",
                        f"'{declarator.name}' appears to hold a secret value hardcoded directly in "
                        f"source code. Hardcoded credentials are a critical risk in shared/public "
                        f"repositories. Load secrets from environment variables or a secrets manager.",
                        node.position,
                    )

    # --- External tool integration: Semgrep (Java) ---
    # Same rationale as the Python analyzer -- broadens coverage beyond
    # our hand-written AST rules using Semgrep's community-maintained
    # Java security rule sets.
    findings.extend(run_semgrep(code, "java"))

    summary = SecuritySummary(
        total_findings=len(findings),
        critical=sum(1 for f in findings if f.severity.value == "critical"),
        high=sum(1 for f in findings if f.severity.value == "high"),
        medium=sum(1 for f in findings if f.severity.value == "medium"),
        low=sum(1 for f in findings if f.severity.value == "low"),
    )

    return SecurityScanReport(
        language="java",
        findings=findings,
        summary=summary,
        overall_severity=compute_overall_severity(findings),
    )
