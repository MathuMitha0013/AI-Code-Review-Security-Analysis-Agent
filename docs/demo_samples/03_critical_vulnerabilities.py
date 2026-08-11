"""
Secoria Demo Sample 3 — Critical OWASP Security Vulnerabilities
Expected Result:
- Code Health Score: < 50 / 100
- Total Findings: Multiple Security & Quality Findings
- Severity: CRITICAL
"""

import os
import sqlite3
import hashlib
import pickle

# OWASP A07: Hardcoded Credentials / Secrets
AWS_SECRET_KEY = "AKIAIOSFODNN7EXAMPLE_SECRET_KEY"
DATABASE_PASSWORD = "super_secret_admin_pass_123"

class LegacyUserPortal:
    
    # OWASP A03: SQL Injection via String Concatenation
    def authenticate_user(self, db_conn, username, password):
        cursor = db_conn.cursor()
        query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
        cursor.execute(query)
        return cursor.fetchone()

    # OWASP A03: OS Command Injection via os.system
    def ping_network_node(self, target_ip):
        os.system(f"ping -c 1 {target_ip}")

    # OWASP A02: Weak Cryptography (MD5)
    def hash_password(self, raw_password):
        md5_object = hashlib.md5()
        md5_object.update(raw_password.encode('utf-8'))
        return md5_object.hexdigest()

    # OWASP A08: Insecure Deserialization via pickle
    def deserialize_payload(self, raw_bytes):
        return pickle.loads(raw_bytes)
