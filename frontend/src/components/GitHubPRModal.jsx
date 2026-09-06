import React, { useState } from 'react'
import { simulatePRReview } from '../services/api'

const SAMPLE_VULNERABLE_DIFF = `diff --git a/app/auth_controller.py b/app/auth_controller.py
index 1029384..5647382 100644
--- a/app/auth_controller.py
+++ b/app/auth_controller.py
@@ -10,6 +10,12 @@ def authenticate_user(cursor, username, password):
-    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
+    API_SECRET_KEY = "sk-live-998877665544332211"
+    # Vulnerable direct SQL concatenation & OS ping
+    os.system(f"ping -c 1 {username}")
+    cursor.execute(f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'")
+    return cursor.fetchone()
`

const SAMPLE_CLEAN_DIFF = `diff --git a/app/auth_controller.py b/app/auth_controller.py
index 1029384..5647382 100644
--- a/app/auth_controller.py
+++ b/app/auth_controller.py
@@ -10,6 +10,11 @@ def authenticate_user(cursor, username, password):
+    import os
+    api_key = os.environ.get("API_SECRET_KEY", "")
+    cursor.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, password))
+    return cursor.fetchone()
`

const SAMPLE_JAVA_DIFF = `diff --git a/src/main/java/SecurityController.java b/src/main/java/SecurityController.java
index a1b2c3d..e4f5a6b 100644
--- a/src/main/java/SecurityController.java
+++ b/src/main/java/SecurityController.java
@@ -12,6 +12,12 @@ public class SecurityController {
+    private static final String JWT_SECRET = "AIzaSyD-super-secret-key-12345";
+    public Object processUserPayload(byte[] stream) throws Exception {
+        java.io.ObjectInputStream ois = new java.io.ObjectInputStream(new java.io.ByteArrayInputStream(stream));
+        return ois.readObject();
+    }
`

const SAMPLE_MULTIFILE_DIFF = `diff --git a/app/routes/auth.py b/app/routes/auth.py
index 1111111..2222222 100644
--- a/app/routes/auth.py
+++ b/app/routes/auth.py
@@ -1,5 +1,8 @@
+import os
+API_KEY = "sk-live-998877665544332211"
+def run_cmd(user_arg):
+    os.system("echo user: " + user_arg)
diff --git a/app/db/query.py b/app/db/query.py
index 3333333..4444444 100644
--- a/app/db/query.py
+++ b/app/db/query.py
@@ -1,5 +1,8 @@
+def fetch_account(cursor, account_id):
+    query = f"SELECT * FROM accounts WHERE id = '{account_id}'"
+    cursor.execute(query)
`

export default function GitHubPRModal({ isOpen, onClose, onLoadCodeToEditor }) {
  const [activeTab, setActiveTab] = useState('diff') // 'diff' | 'url'
  const [diffText, setDiffText] = useState('')
  const [prUrl, setPrUrl] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [postToGithub, setPostToGithub] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reviewResult, setReviewResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [copiedSuggestionIdx, setCopiedSuggestionIdx] = useState(null)
  const [showGuide, setShowGuide] = useState(true)

  if (!isOpen) return null

  const handleRunInspection = async () => {
    setIsLoading(true)
    setError(null)
    setReviewResult(null)

    try {
      const payload = {
        diff_patch: activeTab === 'diff' ? diffText : null,
        pr_url: activeTab === 'url' ? prUrl : null,
        github_token: githubToken || null,
        post_to_github: postToGithub,
      }
      const data = await simulatePRReview(payload)
      setReviewResult(data)
    } catch (err) {
      setError(err.message || 'Failed to inspect Pull Request.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopySummary = () => {
    if (!reviewResult?.summary_markdown) return
    navigator.clipboard.writeText(reviewResult.summary_markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const diffLineCount = diffText ? diffText.split('\n').length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-white/10 bg-[#0b0f19] shadow-[0_0_50px_rgba(79,70,229,0.18)] overflow-hidden transition-all text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f172a]/95 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25">
              <div className="w-full h-full rounded-[14px] bg-[#0b0f19] flex items-center justify-center text-indigo-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">GitHub PR Review Bot</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  🐍 Python (.py)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  ☕ Java (.java)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Automated security inspection for Pull Requests with OWASP checks & line annotations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
            title="Close PR Reviewer (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Interactive "How to Use" Guide Card */}
        <div className="px-6 pt-3 pb-2 bg-[#0b0f19] border-b border-white/5">
          <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/25 p-3 text-xs transition-all">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <span className="font-bold text-indigo-200">How to Use & Supported Languages Guide</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  Python & Java Only
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-[11px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title={showGuide ? "Hide detailed instructions" : "Show detailed instructions"}
              >
                <span>{showGuide ? 'Hide Instructions ▲' : 'Show Instructions ▼'}</span>
              </button>
            </div>

            {showGuide && (
              <div className="mt-2.5 pt-2.5 border-t border-indigo-500/20 space-y-2 text-slate-300 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#080d1a] border border-white/5 space-y-1">
                    <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                      <span>📝</span> Option 1: Git Diff Simulator (Fastest)
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Paste output from <code className="text-indigo-300 font-mono">git diff</code> or click any quick preset button below to test vulnerabilities without needing an active GitHub repository.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#080d1a] border border-white/5 space-y-1">
                    <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                      <span>🔗</span> Option 2: Live GitHub PR URL
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Paste a GitHub Pull Request link (e.g. <code className="text-indigo-300 font-mono">https://github.com/owner/repo/pull/1</code>). Secoria fetches all modified files and scans them online.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                  <span className="text-emerald-400 font-bold">🛡️ Supported Formats:</span>
                  <span>Scans all <strong className="text-emerald-300">.py</strong> and <strong className="text-amber-300">.java</strong> files for OWASP Top 10 vulnerabilities, CWEs, and secrets. Other files (.md, .json) are safely skipped.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div className="px-6 pt-3 pb-2 border-b border-white/5 bg-[#0b0f19]">
          <div className="inline-flex rounded-2xl border border-white/10 p-1 bg-[#060913] shadow-inner">
            <button
              onClick={() => setActiveTab('diff')}
              title="Test code changes with raw git diff patches or demo presets"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>📝 Git Diff Simulator</span>
            </button>
            <button
              onClick={() => setActiveTab('url')}
              title="Inspect a live Pull Request directly from GitHub by URL"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🔗 GitHub PR URL</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#080c16]/70 custom-scrollbar">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3 shadow-xs animate-slide-up">
              <span className="text-xl shrink-0">⚠️</span>
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {activeTab === 'diff' && (
            <div className="space-y-4">
              {/* Presets Row with High-Tech Dark Badges */}
              <div className="flex items-center justify-between flex-wrap gap-2.5">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="text-amber-400">⚡</span>
                  <span>Quick Presets:</span>
                  <span className="text-[11px] font-normal text-slate-400">(Click to load test diff)</span>
                </span>
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    onClick={() => setDiffText(SAMPLE_VULNERABLE_DIFF)}
                    title="Load a Python diff with SQL Injection, Command Injection & Hardcoded API Secret"
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.12)] transition-all hover:scale-105 cursor-pointer"
                  >
                    🚨 Vulnerable Python
                  </button>
                  <button
                    onClick={() => setDiffText(SAMPLE_JAVA_DIFF)}
                    title="Load a Java diff with Insecure ObjectInputStream Deserialization & Hardcoded JWT Secret"
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.12)] transition-all hover:scale-105 cursor-pointer"
                  >
                    ☕ Java Vulnerable
                  </button>
                  <button
                    onClick={() => setDiffText(SAMPLE_MULTIFILE_DIFF)}
                    title="Load a multi-file diff reviewing both auth.py and query.py changes"
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:border-sky-500/50 shadow-[0_0_12px_rgba(14,165,233,0.12)] transition-all hover:scale-105 cursor-pointer"
                  >
                    📂 Multi-File PR
                  </button>
                  <button
                    onClick={() => setDiffText(SAMPLE_CLEAN_DIFF)}
                    title="Load a safe, clean Python diff using environment variables and parameterized SQL queries"
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.12)] transition-all hover:scale-105 cursor-pointer"
                  >
                    ✅ Clean PR
                  </button>
                  {(diffText || reviewResult) && (
                    <button
                      onClick={() => {
                        setDiffText('')
                        setReviewResult(null)
                        setError(null)
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/30 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Clear diff text & scan output"
                    >
                      🗑️ Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* IDE Styled Diff Textarea Frame */}
              <div className="rounded-2xl border border-white/10 bg-[#050811] shadow-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-500/60">
                {/* Editor Header Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1424] border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500/90 ring-1 ring-rose-500/30" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/90 ring-1 ring-amber-500/30" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/90 ring-1 ring-emerald-500/30" />
                    <span className="ml-2 text-xs font-mono font-bold text-slate-300">
                      unified-patch.diff
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                    <span>{diffLineCount} lines</span>
                    {diffText && (
                      <button
                        onClick={() => {
                          setDiffText('')
                          setReviewResult(null)
                          setError(null)
                        }}
                        className="text-xs font-semibold text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={diffText}
                  onChange={(e) => setDiffText(e.target.value)}
                  rows={9}
                  className="w-full font-mono text-xs sm:text-[13px] p-4 bg-[#050811] text-slate-200 placeholder-slate-600 focus:outline-none transition-colors resize-y leading-relaxed selection:bg-indigo-600 selection:text-white"
                  placeholder={`Paste your unified Git Diff patch here...\n\nExample:\ndiff --git a/services/auth.py b/services/auth.py\n--- a/services/auth.py\n+++ b/services/auth.py\n@@ -1,3 +1,6 @@\n+API_KEY = "sk-live-12345"\n+os.system("echo " + user_input)\n\nOr click any quick preset button above to load a demo diff!`}
                />
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4 p-5 rounded-2xl border border-white/10 bg-[#0d1322] shadow-sm">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  GitHub Pull Request URL
                </label>
                <input
                  type="text"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository/pull/123"
                  className="w-full text-xs sm:text-sm px-4 py-3 rounded-xl bg-[#060913] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  GitHub Personal Access Token (PAT) <span className="text-[11px] font-normal text-slate-400">(Optional for private repos or live PR comments)</span>
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full text-xs sm:text-sm px-4 py-3 rounded-xl bg-[#060913] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={postToGithub}
                  onChange={(e) => setPostToGithub(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#060913] text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Post review comment & inline line annotations directly to the GitHub PR</span>
              </label>
            </div>
          )}

          {/* Inspection Trigger Button */}
          <div className="flex justify-end pt-1">
            <button
              onClick={handleRunInspection}
              disabled={isLoading || (activeTab === 'diff' && !diffText.trim()) || (activeTab === 'url' && !prUrl.trim())}
              className="btn-glow px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Analyzing PR Diff & Security Gates...</span>
                </>
              ) : (
                <>
                  <span className="text-base">🚀</span>
                  <span>Inspect Pull Request</span>
                </>
              )}
            </button>
          </div>

          {/* Inspection Results View */}
          {reviewResult && (
            <div className="pt-6 border-t border-white/10 space-y-5 animate-slide-up">
              
              {/* Gate Banner */}
              <div className={`p-5 rounded-2xl border flex items-center justify-between flex-wrap gap-4 shadow-lg transition-all ${
                reviewResult.gate_status === 'PASSED'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200 shadow-rose-500/10'
              }`}>
                <div className="flex items-center gap-3.5">
                  <span className="text-3xl shrink-0">
                    {reviewResult.gate_status === 'PASSED' ? '🛡️' : '🚨'}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                      PR Merge Security Status:
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        reviewResult.gate_status === 'PASSED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {reviewResult.gate_status}
                      </span>
                    </h3>
                    <p className="text-xs font-medium opacity-90 mt-0.5">
                      {reviewResult.gate_status === 'PASSED'
                        ? 'No critical OWASP vulnerabilities detected. Pull request is safe to merge.'
                        : `Blocked by ${reviewResult.critical_findings || reviewResult.total_findings} security vulnerabilities. Remediation required before merge.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Health Score</span>
                    <div className="text-2xl font-black font-mono text-white">
                      {reviewResult.overall_health_score}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xs">
                  <span className="text-slate-400 font-semibold">Files Analyzed</span>
                  <div className="text-lg font-extrabold text-white mt-0.5 font-mono">
                    {reviewResult.files_reviewed?.length || 0}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xs">
                  <span className="text-slate-400 font-semibold">Total Issues</span>
                  <div className="text-lg font-extrabold text-white mt-0.5 font-mono">
                    {reviewResult.total_findings}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xs">
                  <span className="text-slate-400 font-semibold">Critical Risks</span>
                  <div className="text-lg font-extrabold text-rose-400 mt-0.5 font-mono">
                    {reviewResult.critical_findings}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0f172a]/90 border border-white/10 shadow-xs">
                  <span className="text-slate-400 font-semibold">Inline Annotations</span>
                  <div className="text-lg font-extrabold text-indigo-400 mt-0.5 font-mono">
                    {reviewResult.inline_comments_count}
                  </div>
                </div>
              </div>

              {/* Inline File Annotations */}
              {reviewResult.files_reviewed?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                    📂 Changed Files & Inline Annotations
                  </h4>
                  {reviewResult.files_reviewed.map((file, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-[#0d1322] overflow-hidden text-xs shadow-md">
                      <div className="flex items-center justify-between px-4 py-3 bg-[#111827] border-b border-white/10 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{file.filename}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase">
                            {file.language}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${file.health_score < 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            Health: {file.health_score}/100
                          </span>
                          {file.code && onLoadCodeToEditor && (
                            <button
                              onClick={() => {
                                onLoadCodeToEditor(file.code, file.language)
                                onClose()
                              }}
                              className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              ⚡ Load File in Editor
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {file.inline_comments?.length > 0 ? (
                          file.inline_comments.map((comment, cIdx) => (
                            <div key={cIdx} className="p-4 rounded-xl bg-[#070b14] border border-white/10 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  <span>{comment.severity === 'critical' ? '🚨' : '⚠️'}</span>
                                  Line {comment.line}: {comment.title}
                                </span>
                                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  {comment.severity}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                                {comment.body}
                              </p>
                              {comment.suggested_fix && (
                                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 font-mono text-xs space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                                    <span>💡 Suggested Fix:</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(comment.suggested_fix)
                                        setCopiedSuggestionIdx(`${idx}-${cIdx}`)
                                        setTimeout(() => setCopiedSuggestionIdx(null), 2000)
                                      }}
                                      className="hover:underline text-[11px] text-emerald-300 font-bold cursor-pointer"
                                    >
                                      {copiedSuggestionIdx === `${idx}-${cIdx}` ? '✅ Copied' : '📋 Copy Fix'}
                                    </button>
                                  </div>
                                  <pre className="whitespace-pre-wrap leading-relaxed">{comment.suggested_fix}</pre>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-400 text-xs italic">
                            No security or quality issues detected in this file diff.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PR Review Markdown Output */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                    📋 Generated GitHub PR Review Summary Markdown
                  </h4>
                  <button
                    onClick={handleCopySummary}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#0f172a] border border-white/10 text-slate-200 hover:border-indigo-500 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>{copied ? '✅' : '📋'}</span>
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Markdown'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-[#050811] text-slate-200 border border-white/10 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {reviewResult.summary_markdown}
                </pre>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#0f172a]/95">
          <div className="text-xs font-medium text-slate-400">
            Secoria PR Review Agent
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
