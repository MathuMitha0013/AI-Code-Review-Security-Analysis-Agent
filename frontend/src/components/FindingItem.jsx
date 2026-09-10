import { useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import { remediateFinding } from '../services/api'

// Mapping finding properties to the 4 mentor-specified Recommendation Types (Slide 2)
const RECOMMENDATION_TYPES = {
  security: {
    label: 'Security Recommendation',
    badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  },
  maintainability: {
    label: 'Maintainability Recommendation',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  performance: {
    label: 'Performance Recommendation',
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  quality: {
    label: 'Code Quality Recommendation',
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
}

function getRecommendationTypeInfo(sourceAgent, category) {
  if (sourceAgent === 'security') return RECOMMENDATION_TYPES.security
  if (category === 'complexity' || category === 'design_issue') return RECOMMENDATION_TYPES.maintainability
  if (category === 'performance') return RECOMMENDATION_TYPES.performance
  return RECOMMENDATION_TYPES.quality
}

const SEVERITY_STYLES = {
  critical: 'bg-rose-500/10 text-rose-500 border-rose-500/25',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/25',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
  low: 'bg-sky-500/10 text-sky-500 border-sky-500/25',
}

const AGENT_LABELS = {
  code_analysis: 'Code Quality',
  security: 'Security',
}

export default function FindingItem({ finding, fullCode, language, onAskAssistant, onOpenChat }) {
  const [isLoading, setIsLoading] = useState(false)
  const [remediation, setRemediation] = useState(null)
  const [error, setError] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleAsk = onAskAssistant || onOpenChat

  const recType = getRecommendationTypeInfo(finding.source_agent, finding.category)

  async function handleGetFix() {
    setIsLoading(true)
    setError(null)
    try {
      let codeSnippet = finding.code_snippet
      if (!codeSnippet) {
        if (finding.line && fullCode) {
          const lines = fullCode.split('\n')
          codeSnippet = lines[finding.line - 1] || ''
        } else {
          codeSnippet = ''
        }
      }

      const result = await remediateFinding({
        finding_title: finding.title,
        finding_description: finding.description,
        code_snippet: codeSnippet,
        language: language,
        full_code: fullCode || null,
      })

      setRemediation(result.remediation)
      setIsExpanded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleCopyFix() {
    if (!remediation?.fixed_code) return
    navigator.clipboard.writeText(remediation.fixed_code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleDownloadFix() {
    if (!remediation?.fixed_code) return
    const isJava = language?.toLowerCase() === 'java'
    const ext = isJava ? 'java' : 'py'
    const safeTitle = (finding.title || 'fixed_snippet')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 30)
    const filename = `${safeTitle}_fix.${ext}`
    const blob = new Blob([remediation.fixed_code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const highlightedCodeHtml = remediation
    ? Prism.highlight(
        remediation.fixed_code,
        Prism.languages[language] || Prism.languages.clike,
        language
      )
    : ''

  return (
    <li className="finding-item-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg interactive-card">
      {/* Finding Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-[var(--color-text-primary)] text-sm sm:text-base">{finding.title}</h4>
            <span className="rounded-md bg-[var(--color-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border border-[var(--color-border)]">
              {AGENT_LABELS[finding.source_agent]}
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            <span className="font-semibold text-indigo-500 dark:text-indigo-400">{finding.category}</span>
            {finding.line != null && <span className="font-mono ml-2 font-bold text-[var(--color-text-primary)]">· Line {finding.line}</span>}
          </p>
        </div>

        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${SEVERITY_STYLES[finding.severity]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${finding.severity === 'critical' ? 'bg-rose-500 animate-ping' : 'bg-current'}`} />
          {finding.severity}
        </span>
      </div>

      {/* Description & Snippet */}
      <p className="mt-3 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">{finding.description}</p>
      
      {finding.code_snippet && (
        <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-inner">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/40 px-3 py-1 text-[10px] font-mono text-[var(--color-text-muted)]">
            <span>FLAGGED CODE</span>
            {finding.line != null && <span>Line {finding.line}</span>}
          </div>
          <pre className="overflow-x-auto p-3 font-mono text-xs text-[var(--color-text-primary)] leading-relaxed">
            <code>{finding.code_snippet}</code>
          </pre>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-2 border-t border-[var(--color-border)]">
        {!remediation ? (
          <button
            onClick={handleGetFix}
            disabled={isLoading}
            className="btn-glow inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating Fix…</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Remediate with AI</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer"
          >
            <span>{isExpanded ? '▲ Hide Remediation' : '▼ View Suggested Fix'}</span>
          </button>
        )}

        <button
          onClick={() => handleAsk && handleAsk(finding)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Ask Assistant</span>
        </button>
      </div>

      {/* Error handling */}
      {error && (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-500 animate-slide-up">
          <p className="font-bold">Unable to generate remediation suggestion:</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* Suggested Fix Panel */}
      {remediation && isExpanded && (
        <div className="mt-4 space-y-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/80 p-4.5 shadow-inner animate-slide-up">
          {/* Classification Badge */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
            <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${recType.badge}`}>
              {recType.label}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyFix}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                {copied ? '✓ Copied' : '📋 Copy Fix'}
              </button>
              <button
                onClick={handleDownloadFix}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer"
                title="Download this corrected code snippet"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Fix</span>
              </button>
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-1">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Why this is a problem</h5>
            <p className="text-xs sm:text-sm text-[var(--color-text-primary)] leading-relaxed">{remediation.explanation}</p>
          </div>

          {/* Fixed Code Block */}
          <div className="space-y-1">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Corrected Code (Secure Implementation)</h5>
            <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-[var(--color-surface)] shadow-sm">
              <pre className="overflow-x-auto p-3.5 font-mono text-xs text-[var(--color-text-primary)] leading-relaxed">
                <code dangerouslySetInnerHTML={{ __html: highlightedCodeHtml }} />
              </pre>
            </div>
          </div>

          {/* Best Practices */}
          {remediation.best_practice_notes && (
            <div className="space-y-1 border-t border-[var(--color-border)] pt-2.5">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Best Practice Guidance</h5>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{remediation.best_practice_notes}</p>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
