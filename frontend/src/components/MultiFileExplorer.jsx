import React, { useState } from 'react'
import FindingItem from './FindingItem'

export default function MultiFileExplorer({
  zipReport,
  onClose,
  onLoadFileToEditor,
  onOpenChatWithFinding,
}) {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0)
  const [filterLang, setFilterLang] = useState('all') // 'all' | 'python' | 'java'
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'vulnerable' | 'clean'
  const [searchQuery, setSearchQuery] = useState('')

  if (!zipReport) return null

  const { summary, files = [], skipped_files = [], archive_name, overall_health_score, overall_severity } = zipReport

  // Filter files list
  const filteredFiles = files.filter((file) => {
    if (filterLang !== 'all' && file.language !== filterLang) return false
    if (filterStatus === 'vulnerable' && file.findings.length === 0 && !file.syntax_error) return false
    if (filterStatus === 'clean' && (file.findings.length > 0 || file.syntax_error)) return false
    if (searchQuery && !file.file_path.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const activeFile = files[selectedFileIdx] || files[0]

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-500 dark:text-emerald-400'
    if (score >= 70) return 'text-amber-500 dark:text-amber-400'
    if (score >= 50) return 'text-orange-500 dark:text-orange-400'
    return 'text-rose-500 dark:text-rose-400'
  }

  const getSeverityBadge = (sev, hasError) => {
    if (hasError) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
          Syntax Error
        </span>
      )
    }
    switch (sev) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            Critical
          </span>
        )
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30">
            High
          </span>
        )
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
            Medium
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
            Clean
          </span>
        )
    }
  }

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      
      {/* Top Project Repository Header Card */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md p-6 shadow-xl space-y-6 transition-colors">
        
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--color-border)] pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[var(--color-surface)] flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl font-mono">
                📦
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-[var(--color-text-primary)] font-mono">
                  {archive_name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                  Multi-File Scan
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] font-medium mt-0.5">
                Polyglot static analysis report for Python (.py) and Java (.java) repository modules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right px-4 py-2 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-secondary)] block">
                Repository Score
              </span>
              <span className={`text-2xl font-black font-mono ${getScoreColor(overall_health_score)}`}>
                {overall_health_score}<span className="text-xs text-[var(--color-text-secondary)] font-normal">/100</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>✕ Exit Project View</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 text-xs">
          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-xs">
            <span className="text-[var(--color-text-secondary)] font-semibold block">Files Scanned</span>
            <div className="text-lg font-black text-[var(--color-text-primary)] mt-0.5 font-mono flex items-center gap-2">
              <span>{summary?.total_files_scanned || 0}</span>
              <span className="text-xs font-normal text-[var(--color-text-secondary)]">
                (🐍 {summary?.python_files_count} • ☕ {summary?.java_files_count})
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-xs">
            <span className="text-[var(--color-text-secondary)] font-semibold block">Total Code Lines</span>
            <div className="text-lg font-black text-[var(--color-text-primary)] mt-0.5 font-mono">
              {summary?.total_lines_of_code || 0} <span className="text-xs font-normal text-[var(--color-text-secondary)]">LOC</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-xs">
            <span className="text-[var(--color-text-secondary)] font-semibold block">Total Vulnerabilities</span>
            <div className="text-lg font-black text-[var(--color-text-primary)] mt-0.5 font-mono">
              {summary?.total_findings || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-xs">
            <span className="text-[var(--color-text-secondary)] font-semibold block">Critical Risks</span>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
              {summary?.critical || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-xs">
            <span className="text-[var(--color-text-secondary)] font-semibold block">Clean Modules</span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
              {summary?.clean_files_count || 0} <span className="text-xs font-normal text-[var(--color-text-secondary)]">files</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Split-Screen Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar: Repository File Tree (4 Cols) */}
        <div className="lg:col-span-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md p-4 space-y-4 shadow-lg transition-colors">
          
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
              <span>📁 Repository Files</span>
              <span className="px-2 py-0.5 text-[11px] rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] font-mono">
                {files.length}
              </span>
            </h3>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file path..."
              className="w-full text-xs px-3.5 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono transition-all"
            />

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold">
              <button
                onClick={() => setFilterLang('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterLang === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterLang('python')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterLang === 'python'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                🐍 Python ({summary?.python_files_count || 0})
              </button>
              <button
                onClick={() => setFilterLang('java')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterLang === 'java'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                ☕ Java ({summary?.java_files_count || 0})
              </button>
            </div>
          </div>

          {/* Files List */}
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filteredFiles.map((file, idx) => {
              const originalIndex = files.indexOf(file)
              const isSelected = originalIndex === selectedFileIdx
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedFileIdx(originalIndex)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col space-y-1.5 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-1 ring-emerald-500/30'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)]/60 hover:border-emerald-500/40 hover:bg-[var(--color-bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--color-text-primary)] truncate flex items-center gap-1.5">
                      <span>{file.language === 'python' ? '🐍' : '☕'}</span>
                      <span className="truncate">{file.file_path}</span>
                    </span>
                    {getSeverityBadge(file.overall_severity, !!file.syntax_error)}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
                    <span>{file.lines_of_code} LOC</span>
                    <span className={`font-mono font-bold ${getScoreColor(file.health_score)}`}>
                      Score: {file.health_score}/100
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {file.findings.length} {file.findings.length === 1 ? 'issue' : 'issues'}
                    </span>
                  </div>
                </button>
              )
            })}

            {filteredFiles.length === 0 && (
              <div className="p-6 text-center text-xs text-[var(--color-text-secondary)] italic">
                No matching files found.
              </div>
            )}
          </div>

          {/* Skipped files banner */}
          {skipped_files?.length > 0 && (
            <div className="pt-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)]">
              <span className="font-semibold">Skipped ({skipped_files.length}):</span> non-code / ignored assets
            </div>
          )}

        </div>

        {/* Right Main Pane: Active File Findings Inspector (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md p-6 space-y-6 shadow-lg transition-colors">
          
          {activeFile ? (
            <div className="space-y-6">
              
              {/* Active File Header */}
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--color-border)] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl">{activeFile.language === 'python' ? '🐍' : '☕'}</span>
                    <h3 className="text-base sm:text-lg font-mono font-extrabold text-[var(--color-text-primary)]">
                      {activeFile.file_path}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] uppercase">
                      {activeFile.language}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {activeFile.lines_of_code} Lines of Code • {activeFile.findings.length} Security & Quality Findings
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">File Score</span>
                    <span className={`text-xl font-black font-mono ${getScoreColor(activeFile.health_score)}`}>
                      {activeFile.health_score}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Syntax Error Warning */}
              {activeFile.syntax_error && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span>⚠️</span>
                    <span>Syntax Error Detected</span>
                  </div>
                  <pre className="font-mono text-xs whitespace-pre-wrap">{activeFile.syntax_error}</pre>
                </div>
              )}

              {/* Findings List for this file */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-primary)] flex items-center justify-between">
                  <span>Findings in {activeFile.file_path}</span>
                  <span className="text-[var(--color-text-secondary)] font-normal">
                    {activeFile.findings.length} findings
                  </span>
                </h4>

                {activeFile.findings.length > 0 ? (
                  <div className="space-y-4">
                    {activeFile.findings.map((finding, fIdx) => (
                      <FindingItem
                        key={fIdx}
                        finding={finding}
                        language={activeFile.language}
                        onAskAssistant={onOpenChatWithFinding}
                        onOpenChat={onOpenChatWithFinding}
                      />
                    ))}
                  </div>
                ) : !activeFile.syntax_error ? (
                  <div className="p-8 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto">
                      🛡️
                    </div>
                    <h5 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      No Security Vulnerabilities Detected
                    </h5>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300/80 max-w-md mx-auto">
                      This module adheres to secure coding best practices with no OWASP or code smell violations.
                    </p>
                  </div>
                ) : null}
              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[var(--color-text-secondary)]">
              Select a file from the repository list on the left to inspect its findings.
            </div>
          )}

        </div>

      </div>

    </div>
  )
}
