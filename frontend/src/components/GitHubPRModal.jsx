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

  const handleLoadFirstFile = () => {
    if (reviewResult?.files_reviewed?.[0]?.findings?.length && onLoadCodeToEditor) {
      // Find code or use diff
      const firstFile = reviewResult.files_reviewed[0]
      onLoadCodeToEditor(diffText, firstFile.language)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                GitHub PR Bot & CI/CD Gate
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium border border-purple-500/20">
                  Automated Review
                </span>
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Inspect Pull Requests, enforce merge security gates, and generate inline code annotations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'diff'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            📝 Git Diff Simulator
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'url'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            🔗 GitHub PR URL
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {activeTab === 'diff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">
                  Paste a raw unified Git Diff patch or choose a preset:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDiffText(SAMPLE_VULNERABLE_DIFF)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 transition-colors"
                  >
                    🚨 Vulnerable Python
                  </button>
                  <button
                    onClick={() => setDiffText(SAMPLE_JAVA_DIFF)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    ☕ Java Vulnerable
                  </button>
                  <button
                    onClick={() => setDiffText(SAMPLE_MULTIFILE_DIFF)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors"
                  >
                    📂 Multi-File PR
                  </button>
                  <button
                    onClick={() => setDiffText(SAMPLE_CLEAN_DIFF)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
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
                      className="px-2.5 py-1 text-xs rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:text-white transition-all font-semibold flex items-center gap-1 shadow-sm"
                      title="Clear diff and scan results"
                    >
                      🗑️ Clear All
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={diffText}
                  onChange={(e) => setDiffText(e.target.value)}
                  rows={9}
                  className="w-full font-mono text-xs p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-purple-500 transition-colors resize-y"
                  placeholder="Paste your Git Diff here...&#10;&#10;Example:&#10;diff --git a/services/auth.py b/services/auth.py&#10;--- a/services/auth.py&#10;+++ b/services/auth.py&#10;@@ -1,3 +1,6 @@&#10;+API_KEY = &quot;sk-live-12345&quot;&#10;+os.system(&quot;echo &quot; + user_input)&#10;&#10;Or click any sample preset button above to load a demo diff!"
                />
                {diffText && (
                  <button
                    onClick={() => {
                      setDiffText('')
                      setReviewResult(null)
                      setError(null)
                    }}
                    className="absolute top-3 right-3 px-2 py-1 text-[11px] rounded-lg bg-[var(--color-surface)]/80 hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-400 transition-all shadow"
                    title="Clear text"
                  >
                    ✕ Clear Text
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                  GitHub Pull Request URL
                </label>
                <input
                  type="text"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository/pull/123"
                  className="w-full text-xs px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                  GitHub Personal Access Token (PAT) <span className="text-[10px] text-gray-400">(Optional for private repos or live review commenting)</span>
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full text-xs px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-purple-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={postToGithub}
                  onChange={(e) => setPostToGithub(e.target.checked)}
                  className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
                />
                Post review comment & inline line annotations directly to the GitHub PR
              </label>
            </div>
          )}

          {/* Inspection Trigger Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRunInspection}
              disabled={isLoading || (activeTab === 'diff' && !diffText.trim()) || (activeTab === 'url' && !prUrl.trim())}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analyzing PR Diff & Security Gates...
                </>
              ) : (
                <>
                  <span>🚀</span> Inspect Pull Request
                </>
              )}
            </button>
          </div>

          {/* Inspection Results View */}
          {reviewResult && (
            <div className="pt-4 border-t border-[var(--color-border)] space-y-4 animate-fadeIn">
              
              {/* Gate Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-4 ${
                reviewResult.gate_status === 'PASSED'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {reviewResult.gate_status === 'PASSED' ? '🛡️' : '🚨'}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm">
                      CI/CD Merge Security Gate:{' '}
                      <span className="underline decoration-2">
                        {reviewResult.gate_status}
                      </span>
                    </h3>
                    <p className="text-xs opacity-90">
                      {reviewResult.gate_status === 'PASSED'
                        ? 'No critical OWASP vulnerabilities detected. Pull request is safe to merge.'
                        : `Blocked by ${reviewResult.critical_findings || reviewResult.total_findings} security vulnerabilities. Remediation required.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Health Score</span>
                    <div className="text-xl font-black">
                      {reviewResult.overall_health_score}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Files Analyzed</span>
                  <div className="text-base font-bold text-[var(--color-text-primary)] mt-0.5">
                    {reviewResult.files_reviewed?.length || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Total Issues</span>
                  <div className="text-base font-bold text-[var(--color-text-primary)] mt-0.5">
                    {reviewResult.total_findings}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Critical Findings</span>
                  <div className="text-base font-bold text-rose-400 mt-0.5">
                    {reviewResult.critical_findings}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Inline Annotations</span>
                  <div className="text-base font-bold text-purple-400 mt-0.5">
                    {reviewResult.inline_comments_count}
                  </div>
                </div>
              </div>

              {/* Inline File Annotations */}
              {reviewResult.files_reviewed?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                    📂 Changed Files & Inline Annotations
                  </h4>
                  {reviewResult.files_reviewed.map((file, idx) => (
                    <div key={idx} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]/30 overflow-hidden text-xs">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--color-text-primary)]">{file.filename}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
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
                              className="px-2.5 py-1 text-[11px] rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition-all font-medium flex items-center gap-1"
                            >
                              ⚡ Load File in Editor
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {file.inline_comments?.length > 0 ? (
                          file.inline_comments.map((comment, cIdx) => (
                            <div key={cIdx} className="p-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                                  <span>{comment.severity === 'critical' ? '🚨' : '⚠️'}</span>
                                  Line {comment.line}: {comment.title}
                                </span>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  {comment.severity}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--color-text-muted)] whitespace-pre-line">
                                {comment.body}
                              </p>
                              {comment.suggested_fix && (
                                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px] space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                    <span>💡 Suggested Change:</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(comment.suggested_fix)
                                        setCopiedSuggestionIdx(`${idx}-${cIdx}`)
                                        setTimeout(() => setCopiedSuggestionIdx(null), 2000)
                                      }}
                                      className="hover:underline text-[10px] text-emerald-300"
                                    >
                                      {copiedSuggestionIdx === `${idx}-${cIdx}` ? '✅ Copied' : '📋 Copy Fix'}
                                    </button>
                                  </div>
                                  <pre className="whitespace-pre-wrap">{comment.suggested_fix}</pre>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-[var(--color-text-muted)] text-[11px] italic">
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
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                    📋 Generated GitHub PR Review Summary Markdown
                  </h4>
                  <button
                    onClick={handleCopySummary}
                    className="px-3 py-1 text-xs rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-purple-500 transition-colors flex items-center gap-1.5"
                  >
                    <span>{copied ? '✅' : '📋'}</span>
                    {copied ? 'Copied to Clipboard!' : 'Copy Markdown'}
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[11px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                  {reviewResult.summary_markdown}
                </pre>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-hover)]/30">
          <div className="text-xs text-[var(--color-text-muted)]">
            Secoria CI/CD Automation Agent
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
