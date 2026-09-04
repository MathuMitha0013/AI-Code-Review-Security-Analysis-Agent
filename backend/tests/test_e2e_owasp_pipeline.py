"""
End-to-End Pipeline Verification Test for 100% OWASP Coverage & Auto-Remediation Re-Scanning.
"""

import javalang
import ast
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

JAVA_FULL_OWASP_SAMPLE = """
package com.secoria.demo;

import java.io.ByteArrayInputStream;
import java.io.ObjectInputStream;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Random;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;

public class VulnerabilitySuite {
    // 1. Hardcoded Secret
    private static final String API_KEY = "sk-live-998877665544332211";

    // 2. SQL Injection
    public void queryUser(Connection conn, String userId) throws Exception {
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery("SELECT * FROM users WHERE id = '" + userId + "'");
    }

    // 3. Command Injection
    public void executePing(String targetHost) throws Exception {
        Runtime.getRuntime().exec("ping " + targetHost);
    }

    // 4. Broken Cryptography (MD5)
    public byte[] computeHash(String data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        return md.digest(data.getBytes());
    }

    // 5. Insecure Randomness
    public int generateToken() {
        Random rand = new Random();
        return rand.nextInt();
    }

    // 6. Insecure Deserialization
    public Object deserializeObject(byte[] buffer) throws Exception {
        ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(buffer));
        return ois.readObject();
    }

    // 7. Sensitive Cookie Missing HttpOnly/Secure
    public void configureSession(HttpServletResponse response) {
        Cookie sessionCookie = new Cookie("AUTH_TOKEN", "sensitive_123");
        sessionCookie.setHttpOnly(false);
        sessionCookie.setSecure(false);
        response.addCookie(sessionCookie);
    }

    // 8. Cross-Site Scripting (XSS)
    public void renderGreeting(HttpServletResponse response, String username) throws Exception {
        response.getWriter().write("<div>Hello " + username + "</div>");
    }
}
"""

PYTHON_FULL_OWASP_SAMPLE = """
import os
import hashlib
import pickle
import random

API_KEY = "sk-live-998877665544332211"

def query_user(cursor, user_id):
    cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")

def execute_ping(target_host):
    os.system(f"ping {target_host}")

def compute_hash(data):
    return hashlib.md5(data.encode()).hexdigest()

def generate_token():
    return random.randint(1000, 9999)

def deserialize_payload(buffer):
    return pickle.loads(buffer)

def render_greeting(username):
    return render_template_string("<div>Hello " + username + "</div>")

def configure_session(response):
    response.set_cookie("AUTH_TOKEN", value="sensitive_123", httponly=False, secure=False)
"""


def test_java_e2e_review_remediate_rescan_pipeline():
    # 1. Initial Review
    review_resp = client.post("/api/review", data={"code": JAVA_FULL_OWASP_SAMPLE})
    assert review_resp.status_code == 200
    review_data = review_resp.json()
    assert review_data["language"] == "java"
    assert len(review_data["findings"]) >= 6
    assert review_data["summary"]["security_findings"] >= 5

    # 2. Auto-Remediate All
    remed_resp = client.post("/api/remediate-all", json={
        "full_code": JAVA_FULL_OWASP_SAMPLE,
        "language": "java",
        "health_score": 30,
        "findings": review_data["findings"]
    })
    assert remed_resp.status_code == 200
    remed_data = remed_resp.json()
    remediated_code = remed_data["remediated_code"]
    assert len(remed_data["changelog"]) >= 5

    # 3. Verify remediated code is syntactically valid Java
    tree = javalang.parse.parse(remediated_code)
    assert tree is not None

    # 4. Re-Scan Remediated Code
    rescan_resp = client.post("/api/review", data={"code": remediated_code})
    assert rescan_resp.status_code == 200
    rescan_data = rescan_resp.json()
    assert rescan_data["language"] == "java"
    # Security findings count should drop significantly
    assert rescan_data["summary"]["security_findings"] < review_data["summary"]["security_findings"]


def test_python_e2e_review_remediate_rescan_pipeline():
    # 1. Initial Review
    review_resp = client.post("/api/review", data={"code": PYTHON_FULL_OWASP_SAMPLE})
    assert review_resp.status_code == 200
    review_data = review_resp.json()
    assert review_data["language"] == "python"
    assert len(review_data["findings"]) >= 5
    assert review_data["summary"]["security_findings"] >= 4

    # 2. Auto-Remediate All
    remed_resp = client.post("/api/remediate-all", json={
        "full_code": PYTHON_FULL_OWASP_SAMPLE,
        "language": "python",
        "health_score": 35,
        "findings": review_data["findings"]
    })
    assert remed_resp.status_code == 200
    remed_data = remed_resp.json()
    remediated_code = remed_data["remediated_code"]
    assert len(remed_data["changelog"]) >= 5

    # 3. Verify remediated code is syntactically valid Python
    tree = ast.parse(remediated_code)
    assert tree is not None

    # 4. Re-Scan Remediated Code
    rescan_resp = client.post("/api/review", data={"code": remediated_code})
    assert rescan_resp.status_code == 200
    rescan_data = rescan_resp.json()
    assert rescan_data["language"] == "python"
    # Security findings count should drop significantly
    assert rescan_data["summary"]["security_findings"] < review_data["summary"]["security_findings"]


