import { useMemo, useState, useEffect } from 'react'
import { generatePRSummary, exportPdfReport } from '../services/api'
import FindingItem from './FindingItem'

function HealthScoreGauge({ score }) {
  const [animatedScore, setAnimatedScore] = useState(100)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score)
    }, 150)
    return () => clearTimeout(timer)
  }, [score])

  const radius = 24
  const strokeWidth = 4.5
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  let strokeColor = 'stroke-emerald-500'
  let textColor = 'text-emerald-500'
  let ratingText = 'Excellent'
  let borderStyle = 'border-emerald-500/20 bg-emerald-500/5'

  if (score < 50) {
    strokeColor = 'stroke-rose-500'
    textColor = 'text-rose-500'
    ratingText = 'Vulnerable'
    borderStyle = 'border-rose-500/20 bg-rose-500/5'
  } else if (score < 70) {
    strokeColor = 'stroke-orange-500'
    textColor = 'text-orange-500'
    ratingText = 'Warning'
    borderStyle = 'border-orange-500/20 bg-orange-500/5'
  } else if (score < 90) {
    strokeColor = 'stroke-amber-500'
    textColor = 'text-amber-500'
    ratingText = 'Needs Work'
    borderStyle = 'border-amber-500/20 bg-amber-500/5'
  }

  return (
    <div className={`rounded-lg border p-3 flex items-center justify-between transition-all duration-300 ${borderStyle}`}>
      <div className="space-y-0.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Code Health</div>
        <div className={`text-xs font-semibold ${textColor}`}>{ratingText}</div>
      </div>
      <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="stroke-[var(--color-border)]"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            className={`transition-all duration-1000 ease-out ${strokeColor}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <span className="absolute text-xs font-bold text-[var(--color-text-primary)] font-mono">
          {score}
        </span>
      </div>
    </div>
  )
}

/**
 * Findings Display and Severity Scoring Module.
 *
 * Consumes the Orchestrator's UnifiedReviewReport (see
 * backend/app/orchestrator/schemas.py) and provides:
 *   1. Severity summary cards (also act as clickable filters)
 *   2. Source-agent filter (All / Code Quality / Security)
 *   3. Sort control (by severity or by line number)
 *   4. The findings list itself, filtered and sorted client-side
 *
 * WHY FILTER/SORT CLIENT-SIDE INSTEAD OF RE-CALLING THE BACKEND?
 *   The full findings list for one review is small (typically under a few
 *   dozen items) and already fully loaded in memory. Filtering/sorting
 *   client-side is instant and avoids unnecessary network round-trips for
 *   what is purely a "how do I want to VIEW data I already have" concern
 *   -- the backend's job (running agents) is already done by this point.
 */

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low']

const SEVERITY_STYLES = {
  critical: {
    badge: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30',
    card: 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5',
    cardActive: 'border-[var(--color-danger)] bg-[var(--color-danger)]/15',
    text: 'text-[var(--color-danger)]',
  },
  high: {
    badge: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20',
    card: 'border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5',
    cardActive: 'border-[var(--color-danger)] bg-[var(--color-danger)]/10',
    text: 'text-[var(--color-danger)]',
  },
  medium: {
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    card: 'border-amber-500/20 bg-amber-500/5',
    cardActive: 'border-amber-500 bg-amber-500/10',
    text: 'text-amber-500',
  },
  low: {
    badge: 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)] border-[var(--color-border)]',
    card: 'border-[var(--color-border)] bg-[var(--color-surface)]',
    cardActive: 'border-[var(--color-text-secondary)] bg-[var(--color-border)]',
    text: 'text-[var(--color-text-secondary)]',
  },
}

const AGENT_LABELS = {
  code_analysis: 'Code Quality',
  security: 'Security',
}

function SeverityBadge({ severity }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${SEVERITY_STYLES[severity].badge}`}>
      {severity}
    </span>
  )
}

export default function FindingsDashboard({ report, isLoading, error, fullCode, onAskAssistant }) {
  const [activeSeverities, setActiveSeverities] = useState(new Set(SEVERITY_ORDER))
  const [activeAgent, setActiveAgent] = useState('all')
  const [sortBy, setSortBy] = useState('severity')

  // PR Summary and report export states (Milestone 3)
  const [prSummary, setPrSummary] = useState(null)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState(null)
  const [copiedSummary, setCopiedSummary] = useState(false)

  const handleExportCSV = () => {
    if (!report?.findings || report.findings.length === 0) {
      alert('No findings to export!')
      return
    }

    const headers = ['Source Agent', 'Category', 'Title', 'Severity', 'Line', 'Description']
    const rows = report.findings.map((f) => [
      f.source_agent === 'code_analysis' ? 'Code Quality' : 'Security',
      f.category,
      f.title,
      f.severity,
      f.line !== null ? f.line : 'N/A',
      f.description,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val).replace(/"/g, '""')
            return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `secoria_findings_report_${report.language}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const handleExportPDF = async () => {
    setIsExportingPdf(true)
    try {
      await exportPdfReport(report)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert(err.message || 'Failed to export PDF report.')
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleGeneratePRSummary = async () => {
    setIsGeneratingSummary(true)
    setSummaryError(null)
    setPrSummary(null)
    setCopiedSummary(false)

    try {
      const res = await generatePRSummary(report)
      setPrSummary(res.markdown)
    } catch (err) {
      console.error('PR summary generation failed:', err)
      setSummaryError(
        err.message || 'Failed to generate PR summary. Please check your GROQ_API_KEY configuration.'
      )
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const handleCopySummary = () => {
    if (!prSummary) return
    navigator.clipboard.writeText(prSummary)
    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 2000)
  }

  const filteredFindings = useMemo(() => {
    if (!report) return []
    let result = report.findings.filter((f) => activeSeverities.has(f.severity))
    if (activeAgent !== 'all') {
      result = result.filter((f) => f.source_agent === activeAgent)
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'severity') {
        return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
      }
      // sortBy === 'line'
      return (a.line ?? Infinity) - (b.line ?? Infinity)
    })
    return result
  }, [report, activeSeverities, activeAgent, sortBy])

  function toggleSeverity(severity) {
    setActiveSeverities((prev) => {
      const next = new Set(prev)
      if (next.has(severity)) {
        next.delete(severity)
      } else {
        next.add(severity)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-[var(--color-text-secondary)]">Running Code Analysis + Security agents…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-6">
        <p className="font-medium text-[var(--color-danger)]">Review failed</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{error}</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center">
        <p className="text-[var(--color-text-secondary)]">
          Run a full review to see code quality and security findings here, scored by severity.
        </p>
      </div>
    )
  }

  const { summary, overall_severity: overallSeverity, language } = report

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Review Results</h3>
          <span className="rounded-full bg-[var(--color-brand)]/10 px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--color-brand)]">
            {language}
          </span>
        </div>

        {/* Actions & Badges */}
        <div className="flex items-center gap-3">
          <SeverityBadge severity={overallSeverity} />

          <div className="hidden sm:block h-5 w-[1px] bg-[var(--color-border)] no-print"></div>

          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handleExportCSV}
              className="rounded px-2.5 py-1.5 text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-border)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
              title="Download findings spreadsheet (CSV)"
            >
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="rounded px-2.5 py-1.5 text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-border)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download formatted PDF code review report"
            >
              {isExportingPdf ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-text-secondary)] border-t-transparent"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span>PDF Report</span>
                </>
              )}
            </button>
            <button
              onClick={handleGeneratePRSummary}
              disabled={isGeneratingSummary}
              className="rounded px-2.5 py-1.5 text-xs font-semibold bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
              title="Compile GitHub-ready review comment summary"
            >
              {isGeneratingSummary ? 'Compiling PR...' : 'PR Summary'}
            </button>
          </div>
        </div>
      </div>

      {/* PR Summary Panel (on-demand loading) */}
      {(isGeneratingSummary || prSummary || summaryError) && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 pr-summary-panel no-print space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚀</span>
              <h4 className="font-semibold text-sm text-[var(--color-text-primary)]">Pull Request Summary Agent</h4>
            </div>
            <div className="flex items-center gap-2">
              {prSummary && (
                <button
                  onClick={handleCopySummary}
                  className="rounded px-2 py-1 text-xs font-medium bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 border border-[var(--color-success)]/20 transition-all flex items-center gap-1 cursor-pointer"
                >
                  {copiedSummary ? '✓ Copied!' : 'Copy PR Comment'}
                </button>
              )}
              <button
                onClick={() => {
                  setPrSummary(null)
                  setSummaryError(null)
                }}
                className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-2 py-1 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {isGeneratingSummary && (
            <div className="flex items-center gap-3 py-4 text-[var(--color-text-secondary)] text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent"></div>
              <span>Secoria agent compiling unified report and generating GitHub PR comment...</span>
            </div>
          )}

          {summaryError && (
            <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-500">
              {summaryError}
            </div>
          )}

          {prSummary && (
            <div className="relative">
              <pre className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs overflow-auto font-mono text-[var(--color-text-primary)] max-h-80 whitespace-pre-wrap">
                {prSummary}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Severity summary cards & Health Score Gauge — acts as filters & score display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {SEVERITY_ORDER.map((severity) => {
          const count = summary[severity] ?? 0
          const isActive = activeSeverities.has(severity)
          const styles = SEVERITY_STYLES[severity]
          return (
            <button
              key={severity}
              onClick={() => toggleSeverity(severity)}
              className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                isActive ? styles.cardActive : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-50'
              }`}
              title={`Click to ${isActive ? 'hide' : 'show'} ${severity} findings`}
            >
              <div className={`text-xl font-bold ${styles.text}`}>{count}</div>
              <div className="text-xs capitalize text-[var(--color-text-secondary)]">{severity}</div>
            </button>
          )
        })}
        <HealthScoreGauge score={report.health_score ?? 100} />
      </div>

      {/* Filter by agent + sort controls */}
      {summary.total_findings > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex gap-1">
            {['all', 'code_analysis', 'security'].map((agent) => (
              <button
                key={agent}
                onClick={() => setActiveAgent(agent)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeAgent === agent
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {agent === 'all' ? 'All' : AGENT_LABELS[agent]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-secondary)]">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-primary)] cursor-pointer"
            >
              <option value="severity">Severity</option>
              <option value="line">Line number</option>
            </select>
          </div>
        </div>
      )}

      {/* Findings list */}
      {summary.total_findings === 0 ? (
        <p className="rounded-md bg-[var(--color-success)]/10 p-4 text-sm text-[var(--color-success)]">
          No issues found — clean code quality and no OWASP-category vulnerabilities detected.
        </p>
      ) : filteredFindings.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-border)] p-4 text-center text-sm text-[var(--color-text-secondary)]">
          No findings match the current filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredFindings.map((finding, idx) => (
            <FindingItem
              key={idx}
              finding={finding}
              fullCode={fullCode}
              language={language}
              onAskAssistant={onAskAssistant}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
