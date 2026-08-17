import React, { useState, useMemo } from 'react'

/**
 * Category color palette tailored for both light and dark modes
 */
const CATEGORY_COLORS = [
  { fill: '#ef4444', text: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { fill: '#f97316', text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { fill: '#eab308', text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { fill: '#6366f1', text: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  { fill: '#a855f7', text: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { fill: '#06b6d4', text: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  { fill: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { fill: '#ec4899', text: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
]

/**
 * Interactive SVG Donut Chart for Finding Categories
 */
function CategoryDonutChart({ categoryData, totalFindings, onSelectCategory, selectedCategory }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const radius = 64
  const strokeWidth = 24
  const center = 90
  const circumference = 2 * Math.PI * radius

  // Calculate cumulative angles
  let accumulatedPercent = 0
  const slices = categoryData.map((item, idx) => {
    const percent = totalFindings > 0 ? (item.count / totalFindings) * 100 : 0
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference)
    accumulatedPercent += percent

    const colorObj = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
    return {
      ...item,
      percent: Math.round(percent),
      strokeDasharray,
      strokeDashoffset,
      color: colorObj.fill,
      colorObj,
    }
  })

  const activeItem = hoveredIndex !== null ? slices[hoveredIndex] : null

  return (
    <div className="premium-card rounded-2xl p-6 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <h4 className="font-bold text-sm text-[var(--color-text-primary)]">Vulnerability & Smell Distribution</h4>
          <p className="text-xs text-[var(--color-text-secondary)]">OWASP rules and code quality categories</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
          {categoryData.length} Types
        </span>
      </div>

      <div className="my-6 flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center h-48 w-48 shrink-0">
          <svg viewBox="0 0 180 180" className="w-full h-full transform -rotate-90">
            {totalFindings === 0 ? (
              <circle
                cx={center}
                cy={center}
                r={radius}
                className="stroke-emerald-500/20"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
            ) : (
              slices.map((slice, idx) => (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={hoveredIndex === idx || selectedCategory === slice.category ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  fill="transparent"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => onSelectCategory(selectedCategory === slice.category ? null : slice.category)}
                />
              ))
            )}
          </svg>

          {/* Center Info Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            {activeItem ? (
              <>
                <span className="text-xl font-black font-mono text-[var(--color-text-primary)]">
                  {activeItem.percent}%
                </span>
                <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase max-w-[80px] truncate">
                  {activeItem.category}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black font-mono text-[var(--color-text-primary)]">
                  {totalFindings}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Findings
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 space-y-2 w-full max-h-48 overflow-y-auto pr-1">
          {slices.map((slice, idx) => (
            <button
              key={idx}
              onClick={() => onSelectCategory(selectedCategory === slice.category ? null : slice.category)}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === slice.category || hoveredIndex === idx
                  ? `${slice.colorObj.bg} ${slice.colorObj.border} border shadow-xs`
                  : 'hover:bg-[var(--color-bg-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="truncate text-[var(--color-text-primary)] capitalize">{slice.category.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono">
                <span className="text-[var(--color-text-secondary)]">{slice.count}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">({slice.percent}%)</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Severity Density Bar Chart
 */
function SeverityBarChart({ summary, totalFindings, onSelectSeverity, selectedSeverity }) {
  const severities = [
    { key: 'critical', label: 'Critical', color: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500' },
    { key: 'high', label: 'High', color: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500' },
    { key: 'medium', label: 'Medium', color: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500' },
    { key: 'low', label: 'Low', color: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500' },
  ]

  return (
    <div className="premium-card rounded-2xl p-6 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <h4 className="font-bold text-sm text-[var(--color-text-primary)]">Severity Risk Spectrum</h4>
          <p className="text-xs text-[var(--color-text-secondary)]">Prioritized vulnerability risk impact</p>
        </div>
        <span className="text-xs font-bold text-[var(--color-text-secondary)]">
          Total: {totalFindings}
        </span>
      </div>

      {/* Progress Bars */}
      <div className="my-6 space-y-4">
        {severities.map((sev) => {
          const count = summary[sev.key] || 0
          const percentage = totalFindings > 0 ? Math.round((count / totalFindings) * 100) : 0
          const isSelected = selectedSeverity === sev.key

          return (
            <div
              key={sev.key}
              onClick={() => onSelectSeverity(isSelected ? null : sev.key)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-indigo-500/40 bg-indigo-500/5 shadow-xs'
                  : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${sev.color}`} />
                  <span className={`font-bold ${sev.text}`}>{sev.label}</span>
                </div>
                <div className="font-mono text-xs text-[var(--color-text-secondary)]">
                  <strong>{count}</strong> <span className="text-[10px] text-[var(--color-text-muted)]">({percentage}%)</span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="h-2 w-full rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
                <div
                  className={`h-full ${sev.color} rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-[var(--color-text-muted)] text-center">
        💡 Click any severity bar to isolate corresponding code inspection findings.
      </p>
    </div>
  )
}

/**
 * Multi-Agent Pipeline Graph Flow Visualizer
 */
function MultiAgentGraphFlow({ language, summary }) {
  const agents = [
    {
      step: '01',
      title: 'AST Ingestion',
      desc: `${language ? language.toUpperCase() : 'Python/Java'} Syntax Validator & Tokenizer`,
      status: 'Completed',
      badge: '100% Parsed',
      color: 'border-indigo-500/40 bg-indigo-500/5 text-indigo-500'
    },
    {
      step: '02',
      title: 'Code Analysis Agent',
      desc: 'AST Smells, Cyclomatic & Cognitive Complexity',
      status: 'Active',
      badge: `${summary.code_analysis || 0} Issues`,
      color: 'border-purple-500/40 bg-purple-500/5 text-purple-500'
    },
    {
      step: '03',
      title: 'Security Agent',
      desc: 'OWASP Top 10 Vulnerabilities & Pattern Matcher',
      status: 'Active',
      badge: `${summary.security || 0} Risks`,
      color: 'border-rose-500/40 bg-rose-500/5 text-rose-500'
    },
    {
      step: '04',
      title: 'Orchestrator Merge',
      desc: 'Deduplication & 0–100 Weighted Health Rating',
      status: 'Completed',
      badge: 'Unified Report',
      color: 'border-amber-500/40 bg-amber-500/5 text-amber-500'
    },
    {
      step: '05',
      title: 'Remediation & RAG',
      desc: 'Groq Llama 3.3 Diffs + ChromaDB Vector Guidance',
      status: 'Ready',
      badge: 'On-Demand',
      color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-500'
    }
  ]

  return (
    <div className="premium-card rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-6">
        <div>
          <h4 className="font-bold text-sm text-[var(--color-text-primary)]">Multi-Agent Execution Pipeline Flow</h4>
          <p className="text-xs text-[var(--color-text-secondary)]">Parallel concurrent agent telemetry and data synchronization</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Pipeline Verified
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {agents.map((ag, idx) => (
          <div
            key={idx}
            className={`rounded-2xl border p-4 flex flex-col justify-between transition-all hover:scale-102 ${ag.color}`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-black opacity-60">#{ag.step}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                  {ag.badge}
                </span>
              </div>
              <h5 className="font-bold text-xs sm:text-sm text-[var(--color-text-primary)]">{ag.title}</h5>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{ag.desc}</p>
            </div>
            <div className="mt-4 pt-2 border-t border-[var(--color-border)] text-[10px] font-semibold text-[var(--color-text-muted)] flex items-center justify-between">
              <span>Status:</span>
              <span className="text-emerald-500 font-bold">✓ {ag.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Main Visual Analytics Component
 */
export default function VisualAnalytics({ report, onSelectCategory, selectedCategory, onSelectSeverity, selectedSeverity }) {
  if (!report) return null

  const { summary, findings = [], language } = report

  // Compute breakdown by category
  const categoryData = useMemo(() => {
    const map = {}
    findings.forEach((f) => {
      const cat = f.category || 'General Quality'
      map[cat] = (map[cat] || 0) + 1
    })
    return Object.entries(map)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }, [findings])

  const totalFindings = summary?.total_findings ?? findings.length

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top 2 Charts: Donut Chart & Severity Spectrum */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDonutChart
          categoryData={categoryData}
          totalFindings={totalFindings}
          onSelectCategory={onSelectCategory}
          selectedCategory={selectedCategory}
        />

        <SeverityBarChart
          summary={summary}
          totalFindings={totalFindings}
          onSelectSeverity={onSelectSeverity}
          selectedSeverity={selectedSeverity}
        />
      </div>

      {/* Multi-Agent Architecture Pipeline Flow */}
      <MultiAgentGraphFlow
        language={language}
        summary={summary}
      />
    </div>
  )
}
