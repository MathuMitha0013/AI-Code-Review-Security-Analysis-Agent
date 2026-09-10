import { useMemo, useState, useEffect } from 'react'
import { generatePRSummary, exportPdfReport, autoRemediateAll } from '../services/api'
import FindingItem from './FindingItem'
import VisualAnalytics from './VisualAnalytics'
import CodeComparatorModal from './CodeComparatorModal'
import ReportExportModal from './ReportExportModal'

function HealthScoreGauge({ score }) {
  const [animatedScore, setAnimatedScore] = useState(100)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score)
    }, 100)
    return () => clearTimeout(timer)
  }, [score])

  const radius = 28
  const strokeWidth = 5
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  let strokeColor = 'stroke-emerald-500'
  let textColor = 'text-emerald-500'
  let ratingText = 'Excellent'
  let borderStyle = 'border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/10'
  let glowColor = 'rgba(16, 185, 129, 0.2)'

  if (score < 50) {
    strokeColor = 'stroke-rose-500'
    textColor = 'text-rose-500'
    ratingText = 'Critical Risks'
    borderStyle = 'border-rose-500/30 bg-rose-500/5 shadow-rose-500/10 animate-pulse-danger'
    glowColor = 'rgba(244, 63, 94, 0.25)'
  } else if (score < 70) {
    strokeColor = 'stroke-orange-500'
    textColor = 'text-orange-500'
    ratingText = 'Warning Issues'
    borderStyle = 'border-orange-500/30 bg-orange-500/5 shadow-orange-500/10'
    glowColor = 'rgba(249, 115, 22, 0.2)'
  } else if (score < 90) {
    strokeColor = 'stroke-amber-500'
    textColor = 'text-amber-500'
    ratingText = 'Needs Work'
    borderStyle = 'border-amber-500/30 bg-amber-500/5 shadow-amber-500/10'
    glowColor = 'rgba(245, 158, 11, 0.2)'
  }

  return (
    <div className={`rounded-2xl border p-4 flex items-center justify-between transition-all duration-300 shadow-md ${borderStyle} hover:-translate-y-0.5`}>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${score < 50 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Code Health</span>
        </div>
        <div className={`text-sm font-extrabold tracking-tight ${textColor}`}>{ratingText}</div>
        <div className="text-[11px] text-[var(--color-text-muted)] font-medium">Metric Score: 0 — 100</div>
      </div>
      <div className="relative flex items-center justify-center h-16 w-16 shrink-0 drop-shadow-sm">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            className="stroke-[var(--color-border)] opacity-30"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            className={`transition-all duration-1000 ease-out ${strokeColor}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-base font-black text-[var(--color-text-primary)] font-mono leading-none">
            {score}
          </span>
          <span className="text-[9px] text-[var(--color-text-muted)] font-semibold mt-0.5">/100</span>
        </div>
      </div>
    </div>
  )
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low']

const SEVERITY_STYLES = {
  critical: {
    badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    card: 'border-[var(--color-border)] bg-[var(--color-surface)]',
    cardActive: 'border-rose-500/50 bg-rose-500/10 shadow-sm shadow-rose-500/10',
    text: 'text-rose-500',
    dot: 'bg-rose-500',
  },
  high: {
    badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    card: 'border-[var(--color-border)] bg-[var(--color-surface)]',
    cardActive: 'border-orange-500/50 bg-orange-500/10 shadow-sm shadow-orange-500/10',
    text: 'text-orange-500',
    dot: 'bg-orange-500',
  },
  medium: {
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    card: 'border-[var(--color-border)] bg-[var(--color-surface)]',
    cardActive: 'border-amber-500/50 bg-amber-500/10 shadow-sm shadow-amber-500/10',
    text: 'text-amber-500',
    dot: 'bg-amber-500',
  },
  low: {
    badge: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    card: 'border-[var(--color-border)] bg-[var(--color-surface)]',
    cardActive: 'border-sky-500/50 bg-sky-500/10 shadow-sm shadow-sky-500/10',
    text: 'text-sky-500',
    dot: 'bg-sky-500',
  },
}

const AGENT_LABELS = {
  code_analysis: 'Code Quality',
  security: 'Security',
}

function SeverityBadge({ severity }) {
  const styles = SEVERITY_STYLES[severity] || SEVERITY_STYLES.low
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${styles.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      <span>{severity}</span>
    </span>
  )
}

export default function FindingsDashboard({ report, isLoading, error, fullCode, onAskAssistant, onApplyCleanCode }) {
  const [activeTab, setActiveTab] = useState('list') // 'list' | 'visual'
  const [activeSeverities, setActiveSeverities] = useState(new Set(SEVERITY_ORDER))
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [activeAgent, setActiveAgent] = useState('all')
  const [sortBy, setSortBy] = useState('severity')

  // Auto-Remediation & Comparator state
  const [isAutoRemediating, setIsAutoRemediating] = useState(false)
  const [remediationData, setRemediationData] = useState(null)
  const [isComparatorOpen, setIsComparatorOpen] = useState(false)

  // PR Summary and report export states (Milestone 3 & 4)
  const [prSummary, setPrSummary] = useState(null)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState(null)
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const handleAutoRemediate = async () => {
    if (!report?.findings || report.findings.length === 0) {
      alert('No findings detected to remediate!')
      return
    }

    setIsAutoRemediating(true)
    try {
      const codeToRemediate = fullCode || report?.submitted_code || report?.code || ''
      const res = await autoRemediateAll({
        full_code: codeToRemediate,
        language: report.language,
        findings: report.findings,
        health_score: report.health_score || 100,
      })
      setRemediationData(res)
      setIsComparatorOpen(true)
    } catch (err) {
      console.error('Auto-remediation failed:', err)
      alert(err.message || 'Auto-remediation failed. Please check your GROQ_API_KEY.')
    } finally {
      setIsAutoRemediating(false)
    }
  }

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

  const handleDownloadFullCleanCode = () => {
    if (!fullCode) return
    const isJava = (report?.language || '').toLowerCase() === 'java'
    const filename = isJava ? 'Clean_Application.java' : 'clean_main.py'
    const blob = new Blob([fullCode], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const filteredFindings = useMemo(() => {
    if (!report) return []
    let result = report.findings.filter((f) => activeSeverities.has(f.severity))
    if (activeAgent !== 'all') {
      result = result.filter((f) => f.source_agent === activeAgent)
    }
    if (selectedCategory) {
      result = result.filter((f) => f.category === selectedCategory)
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'severity') {
        return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
      }
      return (a.line ?? Infinity) - (b.line ?? Infinity)
    })
    return result
  }, [report, activeSeverities, activeAgent, selectedCategory, sortBy])

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

  function handleSelectSeveritySingle(severity) {
    if (!severity) {
      setActiveSeverities(new Set(SEVERITY_ORDER))
    } else {
      setActiveSeverities(new Set([severity]))
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-lg">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 mb-4 animate-bounce">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h4 className="text-base font-bold text-[var(--color-text-primary)]">Executing Multi-Agent Inspection Pipeline...</h4>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Running Code Analysis + Security Agents in parallel</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-rose-500">Review Execution Failed</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-8 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Run a full review to view prioritized code smells, complexity metrics, and OWASP security findings.
        </p>
      </div>
    )
  }

  const { summary, overall_severity: overallSeverity, language } = report

  return (
    <div className="space-y-5">
      {/* Top Header Card with Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20">
            ✓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Inspection Report</h3>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-indigo-400 border border-indigo-500/20">
                {language}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Total {summary.total_findings} finding{summary.total_findings !== 1 ? 's' : ''} detected
            </p>
          </div>
        </div>

        {/* Actions & Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <SeverityBadge severity={overallSeverity} />

          <div className="hidden sm:block h-6 w-[1px] bg-[var(--color-border)] no-print"></div>

          <div className="flex items-center gap-2 no-print flex-wrap">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3.5 py-2 text-xs font-bold text-indigo-400 shadow-sm hover:border-indigo-500/60 hover:shadow-md transition-all cursor-pointer btn-glow"
              title="Open multi-format export hub (PDF, HTML, JSON, Markdown, CSV)"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Audit Reports</span>
            </button>

            <button
              onClick={handleGeneratePRSummary}
              disabled={isGeneratingSummary}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer btn-glow"
              title="Compile GitHub-ready review comment summary"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>{isGeneratingSummary ? 'Compiling PR...' : 'PR Summary'}</span>
            </button>

            <button
              onClick={handleAutoRemediate}
              disabled={isAutoRemediating || !report?.findings?.length}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer btn-glow animate-pulse-glow"
              title="Automatically resolve all vulnerabilities & generate clean code"
            >
              {isAutoRemediating ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Remediating All...</span>
                </>
              ) : (
                <>
                  <span>⚡ Auto-Remediate All</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PR Summary Panel */}
      {(isGeneratingSummary || prSummary || summaryError) && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-lg no-print space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <h4 className="font-bold text-sm text-[var(--color-text-primary)]">Pull Request Summary Agent</h4>
            </div>
            <div className="flex items-center gap-2">
              {prSummary && (
                <button
                  onClick={handleCopySummary}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSummary ? '✓ Copied!' : 'Copy PR Comment'}
                </button>
              )}
              <button
                onClick={() => {
                  setPrSummary(null)
                  setSummaryError(null)
                }}
                className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-2 py-1 cursor-pointer font-medium"
              >
                Close
              </button>
            </div>
          </div>

          {isGeneratingSummary && (
            <div className="flex items-center gap-3 py-6 text-[var(--color-text-secondary)] text-sm justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
              <span>Secoria PR agent synthesizing findings and formatting markdown tables...</span>
            </div>
          )}

          {summaryError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-500">
              {summaryError}
            </div>
          )}

          {prSummary && (
            <div className="relative">
              <pre className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-xs overflow-auto font-mono text-[var(--color-text-primary)] max-h-80 whitespace-pre-wrap leading-relaxed">
                {prSummary}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* View Switcher Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3 no-print">
        <div className="inline-flex rounded-2xl border border-[var(--color-border)] p-1 bg-[var(--color-surface)] shadow-sm">
          <button
            onClick={() => setActiveTab('list')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]'
            }`}
          >
            <span>📋 Findings List ({filteredFindings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('visual')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'visual'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]'
            }`}
          >
            <span>📊 Visual Graphs & Analytics</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </div>

        {/* Active Filter Pill */}
        {selectedCategory && (
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-1 text-xs text-indigo-400 font-semibold shadow-xs animate-pop-in">
            <span>Filter: <strong>{selectedCategory}</strong></span>
            <button
              onClick={() => setSelectedCategory(null)}
              className="hover:text-indigo-200 cursor-pointer font-black ml-1"
              title="Clear category filter"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Conditional View: Visual Graphs vs List */}
      {activeTab === 'visual' ? (
        <VisualAnalytics
          report={report}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat)
            if (cat) setActiveTab('list')
          }}
          selectedSeverity={activeSeverities.size === 1 ? Array.from(activeSeverities)[0] : null}
          onSelectSeverity={(sev) => {
            handleSelectSeveritySingle(sev)
            if (sev) setActiveTab('list')
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Severity Summary Filter Cards & Health Gauge */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3.5 animate-slide-up">
            {SEVERITY_ORDER.map((severity) => {
              const count = summary[severity] ?? 0
              const isActive = activeSeverities.has(severity)
              const styles = SEVERITY_STYLES[severity]
              return (
                <button
                  key={severity}
                  onClick={() => toggleSeverity(severity)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer interactive-card ${
                    isActive ? styles.cardActive : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-45 hover:opacity-85'
                  }`}
                  title={`Click to ${isActive ? 'hide' : 'show'} ${severity} findings`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`text-2xl font-extrabold font-mono ${styles.text}`}>{count}</div>
                    <span className={`h-2.5 w-2.5 rounded-full ${styles.dot} ${isActive && count > 0 ? (severity === 'critical' ? 'animate-ping' : 'animate-pulse') : ''}`} />
                  </div>
                  <div className="mt-1 text-xs font-bold capitalize text-[var(--color-text-secondary)]">{severity}</div>
                </button>
              )
            })}
            <HealthScoreGauge score={report.health_score ?? 100} />
          </div>

          {/* Filter by agent + sort controls */}
          {summary.total_findings > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm animate-slide-up">
              <div className="flex items-center gap-1.5">
                {['all', 'code_analysis', 'security'].map((agent) => (
                  <button
                    key={agent}
                    onClick={() => setActiveAgent(agent)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      activeAgent === agent
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]'
                    }`}
                  >
                    {agent === 'all' ? 'All Findings' : AGENT_LABELS[agent]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="severity">Severity (Critical First)</option>
                  <option value="line">Line Number</option>
                </select>
              </div>
            </div>
          )}

          {/* Findings List */}
          {summary.total_findings === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center shadow-sm animate-pop-in">
              <div className="text-3xl mb-2 animate-bounce">🎉</div>
              <h4 className="text-base font-bold text-emerald-500">Perfect Health Score (100/100)</h4>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">No quality smells or OWASP vulnerabilities detected in the submitted code.</p>
              {fullCode && (
                <div className="mt-4">
                  <button
                    onClick={handleDownloadFullCleanCode}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/25 hover:scale-105 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Verified Clean Code ({language === 'java' ? 'Application.java' : 'main.py'})</span>
                  </button>
                </div>
              )}
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
              No findings match the selected severity and category filters.
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="block mx-auto mt-2 text-xs font-bold text-indigo-500 underline cursor-pointer"
                >
                  Clear Category Filter
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-3.5 animate-slide-up">
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
      )}

      {/* 1-Click Auto-Remediation & Health Comparator Modal */}
      <CodeComparatorModal
        isOpen={isComparatorOpen}
        onClose={() => setIsComparatorOpen(false)}
        originalCode={fullCode}
        remediationData={remediationData}
        language={language}
        onApplyCleanCode={onApplyCleanCode}
      />

      {/* Multi-Format Report Export Hub Modal */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        report={report}
        code={fullCode}
      />
    </div>
  )
}
