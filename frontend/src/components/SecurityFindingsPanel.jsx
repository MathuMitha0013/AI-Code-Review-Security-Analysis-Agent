const SEVERITY_STYLES = {
  critical: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30',
  high: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)] border-[var(--color-border)]',
}

function SeverityBadge({ severity }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${SEVERITY_STYLES[severity]}`}>
      {severity}
    </span>
  )
}

/**
 * Displays a SecurityScanReport (see backend/app/models/security_schema.py).
 *
 * WHY A SEPARATE COMPONENT FROM ResultPanel?
 *   ResultPanel shows Milestone 1's SubmissionResponse (language, valid,
 *   syntax error) -- a completely different shape and purpose than this
 *   agent's findings list. Keeping them separate means each can evolve
 *   independently as more agents (Code Analysis) get their own panels
 *   in Milestone 3's full findings dashboard.
 */
export default function SecurityFindingsPanel({ report, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-[var(--color-text-secondary)]">Scanning for OWASP vulnerabilities…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-6">
        <p className="font-medium text-[var(--color-danger)]">Security scan failed</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{error}</p>
      </div>
    )
  }

  if (!report) return null

  const { findings, summary, overall_severity: overallSeverity } = report

  return (
    <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text-primary)]">Security Scan Results</h3>
        <SeverityBadge severity={overallSeverity} />
      </div>

      {findings.length === 0 ? (
        <p className="rounded-md bg-[var(--color-success)]/10 p-3 text-sm text-[var(--color-success)]">
          No OWASP-category vulnerabilities detected.
        </p>
      ) : (
        <>
          <div className="flex gap-3 text-sm text-[var(--color-text-secondary)]">
            <span>{summary.total_findings} finding{summary.total_findings !== 1 ? 's' : ''}</span>
            {summary.critical > 0 && <span className="text-[var(--color-danger)]">{summary.critical} critical</span>}
            {summary.high > 0 && <span className="text-[var(--color-danger)]">{summary.high} high</span>}
            {summary.medium > 0 && <span className="text-amber-500">{summary.medium} medium</span>}
            {summary.low > 0 && <span>{summary.low} low</span>}
          </div>

          <ul className="space-y-3">
            {findings.map((finding, idx) => (
              <li key={idx} className="rounded-md border border-[var(--color-border)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{finding.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      {finding.owasp_category}
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
        </>
      )}
    </div>
  )
}
