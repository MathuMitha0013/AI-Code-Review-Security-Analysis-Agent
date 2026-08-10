import { useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import { remediateFinding } from '../services/api'

// Mapping finding properties to the 4 mentor-specified Recommendation Types (Slide 2)
const RECOMMENDATION_TYPES = {
  security: {
    label: 'Security Recommendation',
    badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30',
  },
  maintainability: {
    label: 'Maintainability Recommendation',
    badge: 'bg-violet-500/10 text-violet-500 border-violet-500/20 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30',
  },
  performance: {
    label: 'Performance Recommendation',
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
  },
  quality: {
    label: 'Code Quality Recommendation',
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
  },
}

function getRecommendationTypeInfo(sourceAgent, category) {
  if (sourceAgent === 'security') return RECOMMENDATION_TYPES.security
  if (category === 'complexity' || category === 'design_issue') return RECOMMENDATION_TYPES.maintainability
  if (category === 'performance') return RECOMMENDATION_TYPES.performance
  return RECOMMENDATION_TYPES.quality
}

const SEVERITY_STYLES = {
  critical: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30',
  high: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)] border-[var(--color-border)]',
}

const AGENT_LABELS = {
  code_analysis: 'Code Quality',
  security: 'Security',
}

export default function FindingItem({ finding, fullCode, language, onAskAssistant }) {
  const [isLoading, setIsLoading] = useState(false)
  const [remediation, setRemediation] = useState(null)
  const [error, setError] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const recType = getRecommendationTypeInfo(finding.source_agent, finding.category)

  async function handleGetFix() {
    setIsLoading(true)
    setError(null)
    try {
      // Extract code snippet if missing (common for code quality findings)
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

  // Highlight fixed code using Prism
  const highlightedCodeHtml = remediation
    ? Prism.highlight(
        remediation.fixed_code,
        Prism.languages[language] || Prism.languages.clike,
        language
      )
    : ''

  return (
    <li className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all animate-fadeIn">
      {/* Finding Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-[var(--color-text-primary)] text-sm">{finding.title}</h4>
            <span className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-[9px] font-medium uppercase text-[var(--color-text-secondary)]">
              {AGENT_LABELS[finding.source_agent]}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {finding.category}
            {finding.line != null && ` · Line ${finding.line}`}
          </p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${SEVERITY_STYLES[finding.severity]}`}>
          {finding.severity}
        </span>
      </div>

      {/* Description & Snippet */}
      <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">{finding.description}</p>
      
      {finding.code_snippet && (
        <pre className="mt-2.5 overflow-x-auto rounded-lg bg-[var(--color-bg)] p-3 font-mono text-xs text-[var(--color-text-primary)] border border-[var(--color-border)]">
          <code>{finding.code_snippet}</code>
        </pre>
      )}

      {/* Action buttons (Get Fix / Toggle Fix) */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!remediation ? (
          <button
            onClick={handleGetFix}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] 
                       bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)]
                       transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)]/5
                       disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="h-3 w-3 animate-spin text-[var(--color-brand)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Fix…
              </>
            ) : (
              'Get Fix'
            )}
          </button>
        ) : (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] 
                       bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)]
                       transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)]/5 cursor-pointer"
          >
            {isExpanded ? 'Hide Suggested Fix' : 'Show Suggested Fix'}
          </button>
        )}

        <button
          onClick={() => onAskAssistant && onAskAssistant(finding)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] 
                     bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)]
                     transition-colors hover:border-indigo-500 hover:bg-indigo-500/5 hover:text-indigo-400 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Ask Assistant
        </button>
      </div>

      {/* Error handling */}
      {error && (
        <div className="mt-3 rounded-lg border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5 p-3 text-xs text-[var(--color-danger)] leading-relaxed">
          <p className="font-semibold">Unable to generate remediation suggestion:</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* Suggested Fix Panel (Expands Inline) */}
      {remediation && isExpanded && (
        <div className="mt-4 space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-4 animate-fadeIn">
          {/* Classification Badge (Slide 2) */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${recType.badge}`}>
              {recType.label}
            </span>
            <button
              onClick={handleCopyFix}
              className="text-xs font-semibold text-[var(--color-brand)] transition-colors hover:text-[var(--color-brand-hover)] cursor-pointer"
            >
              {copied ? 'Copied!' : 'Copy Corrected Code'}
            </button>
          </div>

          {/* Explanation */}
          <div className="space-y-1">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Explanation</h5>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{remediation.explanation}</p>
          </div>

          {/* Fixed Code Block */}
          <div className="space-y-1">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Suggested Fix</h5>
            <pre className="overflow-x-auto rounded-lg bg-[var(--color-surface)] p-3 font-mono text-xs text-[var(--color-text-primary)] border border-[var(--color-border)] leading-relaxed">
              <code dangerouslySetInnerHTML={{ __html: highlightedCodeHtml }} />
            </pre>
          </div>

          {/* Best Practices */}
          {remediation.best_practice_notes && (
            <div className="space-y-1 border-t border-[var(--color-border)] pt-2.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Best Practices</h5>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{remediation.best_practice_notes}</p>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
