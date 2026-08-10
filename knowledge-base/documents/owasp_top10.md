# OWASP Top 10 (2021) — Secure Coding Reference

This document summarizes the OWASP Top 10 web application security risks,
intended as a reference for secure code review and remediation guidance.

## A01:2021 — Broken Access Control

Broken access control occurs when restrictions on what authenticated users
are allowed to do are not properly enforced. Common issues include:
- Bypassing access control checks by modifying a URL or API request
- Allowing the primary key to be changed to another user's record
  (Insecure Direct Object Reference / IDOR)
- Elevation of privilege by acting as a user without being logged in,
  or acting as an admin when logged in as a regular user

**Prevention:**
- Deny by default, except for public resources
- Implement access control mechanisms once and reuse them across the app
- Enforce record ownership rather than accepting that a user can create,
  read, update, or delete any record
- Log access control failures and alert admins when appropriate

## A02:2021 — Cryptographic Failures

Previously known as "Sensitive Data Exposure." Occurs when sensitive data
is not properly protected in transit or at rest.

**Prevention:**
- Classify data processed, stored, or transmitted; identify which data is
  sensitive
- Encrypt all sensitive data at rest and in transit using strong, up-to-date
  algorithms
- Never use deprecated hashing functions (MD5, SHA1) for passwords — use
  bcrypt, scrypt, or Argon2 instead
- Disable caching for responses that contain sensitive data

## A03:2021 — Injection

Injection flaws (SQL, NoSQL, OS command, LDAP injection) occur when
untrusted data is sent to an interpreter as part of a command or query.

**Example (vulnerable Python):**
```python
query = "SELECT * FROM users WHERE username = '" + username + "'"
cursor.execute(query)
```

**Example (secure Python — parameterized query):**
```python
query = "SELECT * FROM users WHERE username = %s"
cursor.execute(query, (username,))
```

**Prevention:**
- Use parameterized queries / prepared statements — never concatenate
  user input directly into a query string
- Use an ORM that escapes input by default (e.g., SQLAlchemy, Django ORM)
- Validate and sanitize all input server-side, even if client-side
  validation exists

## A04:2021 — Insecure Design

A broad category representing missing or ineffective security controls at
the design phase, before any code is written. Prevention requires secure
design patterns, threat modeling, and reference architectures — not just
code-level fixes.

## A05:2021 — Security Misconfiguration

Occurs when security settings are not defined, implemented, or maintained
as defaults. Examples: unnecessary features enabled, default accounts
with unchanged passwords, verbose error messages revealing stack traces
to end users, missing security headers.

**Prevention:**
- Remove unused features, frameworks, and sample applications
- Disable directory listing and verbose error messages in production
- Set security headers (Content-Security-Policy, X-Content-Type-Options)

## A06:2021 — Vulnerable and Outdated Components

Using libraries and frameworks with known vulnerabilities. Prevention
includes maintaining an inventory of dependencies, removing unused ones,
and continuously monitoring for CVEs (e.g., via `pip-audit`, `npm audit`,
or GitHub Dependabot).

## A07:2021 — Identification and Authentication Failures

Weaknesses in session management or credential handling that allow
attackers to compromise passwords, keys, or session tokens.

**Prevention:**
- Implement multi-factor authentication where possible
- Never ship or deploy with default credentials
- Enforce strong password policies and check against known-breached
  password lists
- Rotate and invalidate session IDs after login

## A08:2021 — Software and Data Integrity Failures

Code and infrastructure that does not protect against integrity
violations — e.g., using plugins or libraries from untrusted sources,
or auto-update mechanisms without integrity verification.

## A09:2021 — Security Logging and Monitoring Failures

Insufficient logging and monitoring, coupled with missing or ineffective
integration with incident response, allows attackers to further attack
systems, maintain persistence, and tamper with data.

## A10:2021 — Server-Side Request Forgery (SSRF)

SSRF occurs when a web application fetches a remote resource without
validating the user-supplied URL, allowing an attacker to coerce the
application into sending requests to unintended destinations, including
internal-only services.

**Prevention:**
- Validate and sanitize all client-supplied input for any remote resource
  request
- Enforce an allow-list of permitted domains/protocols/ports
- Disable HTTP redirections when fetching remote resources
