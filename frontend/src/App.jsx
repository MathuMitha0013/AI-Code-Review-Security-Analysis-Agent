import { useState } from 'react'
import CodeEditor from './components/CodeEditor'
import FileUpload from './components/FileUpload'
import FindingsDashboard from './components/FindingsDashboard'
import ChatSidebar from './components/ChatSidebar'
import ThemeToggle from './components/ThemeToggle'
import LandingPage from './components/LandingPage'
import { runReview } from './services/api'
import logoDark from './assets/logo-dark.png'
import logoLight from './assets/logo-light.png'

/**
 * Pre-configured Demo Samples for quick mentor evaluation.
 */
const DEMO_SAMPLES = {
  clean: {
    name: '01 Clean & Secure Code (Tier 1)',
    code: `"""
Secoria Demo Sample 1 — Clean, Secure Python Code
Expected: 100/100 Health Score, 0 Findings
"""
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class UserProfileService:
    def __init__(self, database_connection):
        self.db = database_connection

    def get_user_profile(self, user_id: int) -> Optional[Dict[str, str]]:
        if user_id <= 0:
            logger.warning("Invalid user ID provided: %s", user_id)
            return None

        # Safe parameterized query avoiding SQL injection
        query = "SELECT id, username, email FROM users WHERE id = ?"
        cursor = self.db.cursor()
        cursor.execute(query, (user_id,))
        row = cursor.fetchone()
        
        if not row:
            return None
            
        return {
            "id": row[0],
            "username": row[1],
            "email": row[2]
        }

    def calculate_discount(self, order_amount: float, loyalty_tier: str) -> float:
        if order_amount <= 0:
            return 0.0

        tier_discounts = {
            "gold": 0.20,
            "silver": 0.10,
            "bronze": 0.05
        }
        rate = tier_discounts.get(loyalty_tier.lower(), 0.0)
        return round(order_amount * rate, 2)
`
  },
  smells: {
    name: '02 Moderate Complexity & Smells (Tier 2)',
    code: `"""
Secoria Demo Sample 2 — Moderate Complexity & Code Smells
Expected: ~70/100 Health Score, Complexity & Smell Findings
"""
class OrderProcessor:
    def __init__(self):
        self.orders = []

    # High Cyclomatic Complexity & Deep Nesting Code Smell
    def process_complex_shipping(self, user_role, is_active, is_verified, access_level, region_code, department):
        if is_active:
            if is_verified:
                if user_role == "admin":
                    if access_level > 5:
                        if region_code == "US" or region_code == "EU":
                            if department == "IT" or department == "Security":
                                return "Full Expedited Shipping"
                            else:
                                return "Standard Admin Shipping"
                        else:
                            return "Regional Restrict Shipping"
                    else:
                        return "Basic Admin Shipping"
                elif user_role == "manager":
                    if access_level > 3:
                        return "Manager Level 2 Shipping"
                    else:
                        return "Manager Level 1 Shipping"
                else:
                    return "Regular User Shipping"
            else:
                return "Unverified Shipping"
        else:
            return "Inactive User Order"

    def unused_helper_method(self):
        pass
`
  },
  security: {
    name: '03 Critical OWASP Vulnerabilities (Tier 3)',
    code: `"""
Secoria Demo Sample 3 — Critical OWASP Security Vulnerabilities
Expected: < 50/100 Health Score, SQLi, Hardcoded Secrets, Command Injection
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
`
  }
}

/**
 * Helper to read a browser File object as plain text.
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Failed to read file content'))
    reader.readAsText(file)
  })
}

/**
 * App — top-level orchestrator.
 */
export default function App() {
  const [view, setView] = useState('landing') // 'landing' | 'reviewer'
  const [mode, setMode] = useState('paste') // 'paste' | 'upload'
  const [code, setCode] = useState('')
  const [file, setFile] = useState(null)

  const [report, setReport] = useState(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewError, setReviewError] = useState(null)
  const [submittedCode, setSubmittedCode] = useState('')

  // Conversational Assistant (Milestone 3) UI States
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatContext, setChatContext] = useState(null)

  const canSubmit = mode === 'paste' ? code.trim().length > 0 : file !== null
  const hasResults = isReviewing || report !== null || reviewError !== null

  async function handleRunReview() {
    setIsReviewing(true)
    setReviewError(null)
    setReport(null)
    try {
      let codeText = ''
      if (mode === 'paste') {
        codeText = code
        const response = await runReview({ code })
        setReport(response)
      } else {
        if (!file) throw new Error('No file selected')
        codeText = await readFileAsText(file)
        const response = await runReview({ file })
        setReport(response)
      }
      setSubmittedCode(codeText)
    } catch (err) {
      setReviewError(err.message)
    } finally {
      setIsReviewing(false)
    }
  }

  function handleLaunchReviewer() {
    setView('reviewer')
  }

  function handleSelectSample(sampleKey) {
    const sampleObj = DEMO_SAMPLES[sampleKey] || DEMO_SAMPLES.clean
    setCode(sampleObj.code)
    setMode('paste')
    setFile(null)
    setReport(null)
    setReviewError(null)
    setView('reviewer')
  }

  function handleAskAssistant(finding) {
    let snippet = finding.code_snippet
    if (!snippet && finding.line && submittedCode) {
      const lines = submittedCode.split('\n')
      snippet = lines[finding.line - 1] || ''
    }
    
    setChatContext({
      title: finding.title,
      code_snippet: snippet || '',
    })
    setIsChatOpen(true)
  }

  function handleClearChatContext() {
    setChatContext(null)
  }

  function switchMode(newMode) {
    setMode(newMode)
    setReport(null)
    setReviewError(null)
    setSubmittedCode('')
    setChatContext(null)
    setIsChatOpen(false)
  }

  function handleClear() {
    setCode('')
    setFile(null)
    setReport(null)
    setReviewError(null)
    setSubmittedCode('')
    setChatContext(null)
    setIsChatOpen(false)
  }

  const handleApplyCleanCode = async (cleanCode) => {
    setCode(cleanCode)
    setMode('paste')
    setFile(null)
    setSubmittedCode(cleanCode)
    setIsReviewing(true)
    setReviewError(null)
    try {
      const data = await runReview({ code: cleanCode })
      setReport(data)
    } catch (err) {
      setReviewError(err.message || 'Review failed.')
    } finally {
      setIsReviewing(false)
    }
  }

  if (view === 'landing') {
    return (
      <LandingPage
        onLaunchApp={handleLaunchReviewer}
        onSelectSample={handleSelectSample}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] bg-grid-matrix transition-colors">
      <header className="border-b border-[var(--color-border)] no-print sticky top-0 z-30 bg-[var(--color-surface)]/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('landing')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-bold text-[var(--color-text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/40 shadow-xs transition-all cursor-pointer"
              title="Return to Landing Page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </button>

            <div className="h-4 w-[1px] bg-[var(--color-border)] hidden sm:block" />

            <div className="flex items-center gap-3">
              <img
                src={logoDark}
                alt="Secoria Logo"
                className="h-8 w-auto drop-shadow-[0_2px_10px_rgba(99,102,241,0.3)] transition-transform hover:scale-105"
              />
              <div className="flex items-baseline gap-2.5">
                <span className="text-base font-black tracking-widest text-[var(--color-text-primary)] font-brand">SECORIA</span>
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] hidden lg:inline border-l border-[var(--color-border)] pl-2.5">
                  Development of Smart Code Inspection Platform with Vulnerability Detection System
                </span>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 print-w-full">
        {/* Workspace Title Header */}
        <div className="border-b border-[var(--color-border)] pb-5 no-print">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Interactive Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            Code Inspection & Security Analysis
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-secondary)] font-medium">
            Development of Smart Code Inspection Platform with Vulnerability Detection System
          </p>
        </div>

        {/* Editor section — centered, compact width */}
        <div className="mx-auto mt-6 max-w-3xl no-print">
          <div className="inline-flex rounded-xl border border-[var(--color-border)] p-1 bg-[var(--color-bg-subtle)] shadow-xs">
            {['paste', 'upload'].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                  mode === m
                    ? 'bg-[var(--color-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm border border-[var(--color-border)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {mode === 'paste' ? (
              <CodeEditor value={code} onChange={setCode} disabled={isReviewing} />
            ) : (
              <FileUpload onFileSelected={setFile} disabled={isReviewing} />
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleRunReview}
              disabled={!canSubmit || isReviewing}
              className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-5 py-3.5 font-bold text-white
                         shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] hover:shadow-indigo-500/35
                         disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {isReviewing ? 'Running Multi-Agent Analysis…' : 'Run Full Review'}
            </button>
            <button
              onClick={handleClear}
              disabled={isReviewing || (!code && !file && !report)}
              title="Clear code and results"
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]
                         px-5 py-3.5 font-semibold text-[var(--color-text-secondary)] shadow-xs transition-colors
                         hover:border-rose-500/40 hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-500/10
                         disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results section */}
        {hasResults && (
          <div className="mt-10">
            <FindingsDashboard
              report={report}
              isLoading={isReviewing}
              error={reviewError}
              fullCode={submittedCode}
              onAskAssistant={handleAskAssistant}
              onApplyCleanCode={handleApplyCleanCode}
            />
          </div>
        )}
      </main>

      {/* RAG Chat Sidebar (Milestone 3) */}
      <ChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialContext={chatContext}
        onClearContext={handleClearChatContext}
      />

      {/* Floating Chat Trigger Button */}
      {!isChatOpen && (
        <button
          onClick={() => {
            setChatContext(null)
            setIsChatOpen(true)
          }}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-full shadow-2xl shadow-indigo-500/30 transition duration-200 hover:scale-110 z-40 cursor-pointer flex items-center justify-center border border-indigo-400/30"
          title="Open secure coding assistant"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  )
}
