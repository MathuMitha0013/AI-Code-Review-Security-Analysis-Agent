import React, { useState, useRef } from 'react'
import JSZip from 'jszip'
import { reviewZipArchive } from '../services/api'

// Preset demo projects for 1-click test evaluation
const PRESETS = [
  {
    id: 'vulnerable_polyglot',
    name: 'Multi-Tier Vulnerable App',
    badge: '🚨 Critical OWASP Risks',
    badgeClass: 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.12)]',
    iconBg: 'bg-rose-500/20 text-rose-400',
    icon: '⚡',
    desc: 'Simulates microservices with SQL injection, command execution, and hardcoded JWT secrets across Python and Java modules.',
    files: {
      'src/services/auth_service.py': `import os, sqlite3

API_KEY = "sk-live-998877665544332211"

def authenticate_user(username, password):
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    # SQL injection via string concatenation
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    return cursor.fetchone()

def ping_server(host):
    # Command Injection
    os.system("ping -c 1 " + host)
`,
      'src/controllers/PaymentController.java': `package com.app.controllers;

import java.io.ByteArrayInputStream;
import java.io.ObjectInputStream;
import javax.servlet.http.Cookie;

public class PaymentController {
    private static final String API_SECRET = "MOCK_SECRET_KEY_EXAMPLE_ABC12345";

    public Object processPaymentObject(byte[] payload) throws Exception {
        // Insecure Deserialization
        ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(payload));
        return ois.readObject();
    }

    public void setSessionCookie(Cookie cookie) {
        // Insecure Cookie missing HttpOnly
        cookie.setHttpOnly(false);
    }
}
`,
      'src/utils/math_helpers.py': `def calculate_total(items: list) -> float:
    \"\"\"Calculates sum safely.\"\"\"
    return sum(item.get("price", 0.0) for item in items)
`,
      'src/models/UserModel.java': `package com.app.models;

public class UserModel {
    private String username;
    private String email;

    public UserModel(String username, String email) {
        this.username = username;
        this.email = email;
    }

    public String getUsername() {
        return username;
    }
}
`,
      'README.md': `# Multi-File Enterprise Demo
Demonstrates automated static code analysis and security auditing.
`
    }
  },

  {
    id: 'clean_polyglot',
    name: 'Hardened Production Repo',
    badge: '✅ 100/100 Health',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.12)]',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    icon: '🛡️',
    desc: 'Production-ready Python & Java services using parameterized SQL queries, ProcessBuilder, secure random tokens, and environment secrets.',
    files: {
      'src/auth/login.py': `import os, sqlite3

def authenticate_user(username, password):
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    # Safe parameterized query
    cursor.execute("SELECT id, username FROM users WHERE username = ? AND password = ?", (username, password))
    return cursor.fetchone()
`,
      'src/services/AuditService.java': `package com.app.services;

import java.security.SecureRandom;

public class AuditService {
    public String generateAuditNonce() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return java.util.Base64.getEncoder().encodeToString(bytes);
    }
}
`
    }
  },

  {
    id: 'java_enterprise',
    name: 'Java Security Audit Pack',
    badge: '☕ Java Suite',
    badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.12)]',
    iconBg: 'bg-amber-500/20 text-amber-400',
    icon: '☕',
    desc: 'Java enterprise modules highlighting legacy MD5 password hashing, raw Runtime.exec command execution, and weak crypto.',
    files: {
      'src/security/CryptoUtils.java': `package com.app.security;

import java.security.MessageDigest;

public class CryptoUtils {
    public static byte[] hashPassword(String password) throws Exception {
        // Weak MD5 Hashing
        MessageDigest md = MessageDigest.getInstance("MD5");
        return md.digest(password.getBytes());
    }
}
`,
      'src/system/CommandRunner.java': `package com.app.system;

public class CommandRunner {
    public void executeTool(String tool) throws Exception {
        // Dangerous Runtime.exec
        Runtime.getRuntime().exec(tool);
    }
}
`
    }
  }
]

export default function ZipUploadModal({ isOpen, onClose, onZipReportLoaded }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [activePresetId, setActivePresetId] = useState(null)
  const [scanStep, setScanStep] = useState(0)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFileDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.name.toLowerCase().endsWith('.zip')) {
        setSelectedFile(file)
        setError(null)
      } else {
        setError('Please upload a valid .zip project archive.')
      }
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file.name.toLowerCase().endsWith('.zip')) {
        setSelectedFile(file)
        setError(null)
      } else {
        setError('Please upload a valid .zip project archive.')
      }
    }
  }

  const runAnalysisWithFile = async (zipFile) => {
    setIsScanning(true)
    setError(null)
    setScanStep(1)

    const stepTimer1 = setTimeout(() => setScanStep(2), 400)
    const stepTimer2 = setTimeout(() => setScanStep(3), 1000)

    try {
      const report = await reviewZipArchive(zipFile)
      setScanStep(4)
      setTimeout(() => {
        onZipReportLoaded(report)
        onClose()
      }, 350)
    } catch (err) {
      setError(err.message || 'Failed to analyze ZIP archive.')
    } finally {
      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      setIsScanning(false)
      setActivePresetId(null)
      setScanStep(0)
    }
  }

  const handleStartScan = () => {
    if (!selectedFile) return
    runAnalysisWithFile(selectedFile)
  }

  const handleRunPreset = async (preset) => {
    setActivePresetId(preset.id)
    setIsScanning(true)
    setError(null)
    setScanStep(1)

    try {
      const zip = new JSZip()
      for (const [filePath, content] of Object.entries(preset.files)) {
        zip.file(filePath, content)
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipFile = new File([zipBlob], `${preset.id}.zip`, { type: 'application/zip' })
      await runAnalysisWithFile(zipFile)
    } catch (err) {
      setError(`Failed to create preset ZIP: ${err.message}`)
      setIsScanning(false)
      setActivePresetId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden transition-colors">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-500 p-0.5 shadow-md shadow-emerald-500/25 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[var(--color-surface)] flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-[var(--color-text-primary)]">
                  Multi-File ZIP Project Review
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                  Python & Java Polyglot
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] font-medium mt-0.5">
                Upload a project ZIP to batch scan all Python (.py) and Java (.java) source files
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--color-bg)]">
          
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-3 shadow-xs animate-slide-up">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <p className="font-bold">Inspection Notice</p>
                <p className="font-medium mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-3.5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner border border-emerald-500/20 transition-transform duration-300 hover:scale-110">
                {selectedFile ? (
                  <span className="text-3xl">📦</span>
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </div>

              {selectedFile ? (
                <div>
                  <h4 className="text-sm font-extrabold text-[var(--color-text-primary)] font-mono">
                    {selectedFile.name}
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready for multi-agent security scan
                  </p>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                    Click to choose a different archive
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Drop your project <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">.zip</span> here, or <span className="text-emerald-600 dark:text-emerald-400 underline font-bold">browse</span>
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 font-medium">
                    Supports archives up to 25MB • Scans <span className="font-bold text-[var(--color-text-primary)]">.py</span> and <span className="font-bold text-[var(--color-text-primary)]">.java</span> files
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          {selectedFile && (
            <div className="flex items-center justify-between bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] shadow-xs">
              <div className="text-xs text-[var(--color-text-secondary)]">
                Selected Archive: <span className="font-bold text-[var(--color-text-primary)] font-mono">{selectedFile.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                >
                  ✕ Clear
                </button>
                <button
                  onClick={handleStartScan}
                  disabled={isScanning}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold text-xs shadow-md shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  🚀 Scan Selected Archive
                </button>
              </div>
            </div>
          )}

          {/* Quick Presets Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-2">
                <span>⚡ 1-Click Interactive Demo Presets</span>
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)] font-medium">
                Generates in-memory project ZIP & tests review engine
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleRunPreset(preset)}
                  disabled={isScanning}
                  className={`p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-emerald-500 dark:hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 active:translate-y-0 transition-all duration-200 text-left flex flex-col justify-between space-y-3.5 cursor-pointer disabled:opacity-50 group ${
                    activePresetId === preset.id ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/30' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${preset.badgeClass}`}>
                        {preset.badge}
                      </span>
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${preset.iconBg}`}>
                        {preset.icon}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {preset.name}
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
                      {preset.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-[var(--color-border)] text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="font-mono text-[var(--color-text-secondary)] font-normal">
                      {Object.keys(preset.files).length} files
                    </span>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {activePresetId === preset.id ? 'Scanning...' : 'Run Scan →'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scanning Progress Overlay */}
          {isScanning && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-[var(--color-text-primary)] space-y-3 animate-slide-up shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>
                    {scanStep === 1 && 'Unpacking & validating ZIP archive structure...'}
                    {scanStep === 2 && 'Verifying Zip Slip & path traversal safety...'}
                    {scanStep === 3 && 'Dispatching concurrent Python & Java security agents...'}
                    {scanStep === 4 && 'Aggregating repository metrics & health score!'}
                  </span>
                </div>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{scanStep * 25}%</span>
              </div>

              {/* Progress Track */}
              <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-300 rounded-full shadow-xs"
                  style={{ width: `${scanStep * 25}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95">
          <div className="text-xs font-medium text-[var(--color-text-secondary)]">
            Safe In-Memory Multi-Agent Scanner
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
