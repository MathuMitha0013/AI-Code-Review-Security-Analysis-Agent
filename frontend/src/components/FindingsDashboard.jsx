import { useMemo, useState } from 'react'

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

export default function FindingsDashboard({ report, isLoading, error }) {
  const [activeSeverities, setActiveSeverities] = useState(new Set(SEVERITY_ORDER))
  const [activeAgent, setActiveAgent] = useState('all')
  const [sortBy, setSortBy] = useState('severity')

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
      <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Review Results</h3>
          <span className="rounded-full bg-[var(--color-brand)]/10 px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--color-brand)]">
            {language}
          </span>
        </div>
        <SeverityBadge severity={overallSeverity} />
      </div>

      {/* Severity summary cards — also act as filters */}
      <div className="grid grid-cols-4 gap-2">
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
            <li key={idx} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--color-text-primary)]">{finding.title}</p>
                    <span className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[var(--color-text-secondary)]">
                      {AGENT_LABELS[finding.source_agent]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    {finding.category}
                    {finding.line != null && ` · Line ${finding.line}`}
                  </p>
                </div>
                <SeverityBadge severity={finding.severity} />
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{finding.description}</p>
              {finding.code_snippet && (
                <pre className="mt-2 overflow-x-auto rounded bg-[var(--color-bg)] p-2 font-mono text-xs text-[var(--color-text-primary)]">
                  {finding.code_snippet}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
