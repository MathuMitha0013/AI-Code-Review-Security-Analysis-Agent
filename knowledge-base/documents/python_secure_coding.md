# Python Secure Coding Guidelines

## 1. Avoid `eval()` and `exec()` on untrusted input

`eval()` and `exec()` execute arbitrary Python code. If any part of the
input string originates from a user, this is equivalent to giving them
full code execution on your server.

```python
# VULNERABLE
result = eval(user_input)

# SECURE — use ast.literal_eval for safely evaluating literals only
import ast
result = ast.literal_eval(user_input)  # only parses literals, not arbitrary code
```

## 2. Never hardcode secrets

Hardcoded API keys, passwords, or tokens in source code are a critical
vulnerability — especially in public or shared repositories.

```python
# VULNERABLE
API_KEY = "sk-live-abc123..."

# SECURE
import os
API_KEY = os.environ["API_KEY"]  # loaded from environment, never committed
```

## 3. Use parameterized queries for database access

See OWASP A03 (Injection). Always use your database driver's or ORM's
parameterization — never use Python string formatting (`%`, `.format()`,
f-strings) to build SQL queries with user input.

## 4. Validate and sanitize file paths

Unsanitized file paths from user input can lead to path traversal
vulnerabilities, allowing attackers to read or write files outside the
intended directory.

```python
# VULNERABLE
file_path = os.path.join(base_dir, user_supplied_filename)

# SECURE — resolve and verify the path stays within base_dir
resolved = os.path.realpath(os.path.join(base_dir, user_supplied_filename))
if not resolved.startswith(os.path.realpath(base_dir)):
    raise ValueError("Invalid file path")
```

## 5. Use `secrets` module for security-sensitive randomness

Python's `random` module is not cryptographically secure — it should
never be used to generate tokens, passwords, or session IDs.

```python
# VULNERABLE
import random
token = str(random.randint(100000, 999999))

# SECURE
import secrets
token = secrets.token_urlsafe(32)
```

## 6. Avoid `pickle` for untrusted data

Deserializing untrusted data with `pickle.loads()` can lead to arbitrary
code execution, since pickle can reconstruct arbitrary Python objects,
including ones that execute code on deserialization.

```python
# VULNERABLE
data = pickle.loads(untrusted_bytes)

# SECURE — use JSON for data interchange with untrusted sources
import json
data = json.loads(untrusted_bytes)
```

## 7. Keep dependencies updated and audited

Run `pip-audit` or check `pip list --outdated` regularly to catch known
vulnerable package versions (relates to OWASP A06).

## 8. Never disable SSL/TLS certificate verification

```python
# VULNERABLE
requests.get(url, verify=False)

# SECURE — verify=True is the default; never override it in production
requests.get(url)
```
