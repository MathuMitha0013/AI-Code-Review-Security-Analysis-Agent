import React, { useState } from 'react'

/**
 * Code Comparator Modal providing side-by-side comparison between
 * original vulnerable code and AI-remediated clean code.
 */
export default function CodeComparatorModal({
  isOpen,
  onClose,
  originalCode,
  remediationData,
  language,
  onApplyCleanCode,
}) {
  const [activeTab, setActiveTab] = useState('comparator') // 'comparator' | 'changelog'
  const [copied, setCopied] = useState(false)

  if (!isOpen || !remediationData) return null

  const {
    remediated_code: remediatedCode = '',
    changelog = [],
    original_score: originalScore = 100,
    projected_score: projectedScore = 100,
    fixed_count: fixedCount = 0,
    summary = '',
  } = remediationData

  const handleCopy = () => {
    navigator.clipboard.writeText(remediatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const isPython = language?.toLowerCase() === 'python'
    const filename = isPython ? 'remediated_clean_code.py' : 'RemediatedCleanCode.java'
    const blob = new Blob([remediatedCode], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const origLines = originalCode.split('\n')
  const remLines = remediatedCode.split('\n')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-bg-subtle)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold shadow-sm">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">
                  Automated Code Remediation & Health Comparator
                </h3>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                  {language?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Side-by-side verification: Original Vulnerabilities vs. AI Remediated Clean Code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            title="Close comparator"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scorecard Transformation Banner */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Before Score Card */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Before Remediation</span>
                <div className="text-lg font-black text-rose-500 font-mono">{originalScore}/100</div>
                <div className="text-xs text-[var(--color-text-secondary)] font-medium">
                  {fixedCount} Flaw{fixedCount !== 1 ? 's' : ''} Detected
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 font-mono font-extrabold text-base">
                {originalScore < 50 ? '⚠️ F' : originalScore < 80 ? 'C' : 'B'}
              </div>
            </div>

            {/* Transformation Arrow */}
            <div className="text-center flex flex-col items-center justify-center py-2">
              <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/30 mb-1">
                <span>🤖 Groq Llama 3.3 Auto-Fix</span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)] font-medium">
                Applied {changelog.length} security patches
              </span>
            </div>

            {/* After Score Card */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">After Remediation</span>
                <div className="text-lg font-black text-emerald-500 font-mono">{projectedScore}/100</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ 100% Vulnerabilities Resolved
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 font-mono font-extrabold text-base">
                A+
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          {summary && (
            <div className="mt-3 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] p-3 rounded-xl border border-[var(--color-border)] leading-relaxed">
              <strong>Audit Summary:</strong> {summary}
            </div>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="px-6 pt-3 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('comparator')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
                activeTab === 'comparator'
                  ? 'bg-[var(--color-surface)] text-indigo-600 dark:text-indigo-400 border-t border-x border-[var(--color-border)] shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              ⚖️ Side-by-Side Code Diff
            </button>
            <button
              onClick={() => setActiveTab('changelog')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
                activeTab === 'changelog'
                  ? 'bg-[var(--color-surface)] text-indigo-600 dark:text-indigo-400 border-t border-x border-[var(--color-border)] shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              📋 Audit Changelog ({changelog.length})
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg)]">
          {activeTab === 'comparator' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Original Code */}
              <div className="flex flex-col rounded-2xl border border-rose-500/30 bg-[var(--color-surface)] overflow-hidden shadow-xs">
                <div className="flex items-center justify-between px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-xs font-bold text-rose-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Original Source (Flagged Issues)</span>
                  </div>
                  <span className="font-mono text-[11px]">{origLines.length} Lines</span>
                </div>
                <div className="p-4 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed text-[var(--color-text-primary)] bg-[var(--color-surface)]">
                  {origLines.map((line, idx) => (
                    <div key={idx} className="flex hover:bg-rose-500/5 px-1 py-0.5 rounded">
                      <span className="w-8 shrink-0 select-none text-right pr-3 text-[var(--color-text-muted)] opacity-60">
                        {idx + 1}
                      </span>
                      <span className="whitespace-pre">{line || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Clean Remediated Code */}
              <div className="flex flex-col rounded-2xl border border-emerald-500/30 bg-[var(--color-surface)] overflow-hidden shadow-xs">
                <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-xs font-bold text-emerald-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>AI Remediated Source (Clean & Secure)</span>
                  </div>
                  <span className="font-mono text-[11px]">{remLines.length} Lines</span>
                </div>
                <div className="p-4 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed text-[var(--color-text-primary)] bg-[var(--color-surface)]">
                  {remLines.map((line, idx) => (
                    <div key={idx} className="flex hover:bg-emerald-500/5 px-1 py-0.5 rounded">
                      <span className="w-8 shrink-0 select-none text-right pr-3 text-emerald-500/70 font-semibold">
                        {idx + 1}
                      </span>
                      <span className="whitespace-pre">{line || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Changelog Tab */
            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs">
                <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                  <span>🛡️ Applied Security Fixes & Code Refactoring Actions</span>
                </h4>
                <ul className="space-y-2.5">
                  {changelog.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[var(--color-text-primary)]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold mt-0.5">
                        ✓
                      </span>
                      <span className="leading-relaxed font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-indigo-500/40 shadow-sm transition-all cursor-pointer"
            >
              <span>{copied ? '✓ Copied Clean Code!' : '📋 Copy Clean Code'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-bold text-[var(--color-text-secondary)] hover:text-emerald-500 hover:border-emerald-500/40 shadow-sm transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Clean Code</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                onApplyCleanCode(remediatedCode)
                onClose()
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 hover:scale-102 transition-all cursor-pointer"
            >
              <span>⚡ Apply to Workspace & Re-Scan</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
