import React, { useState } from 'react'
import { exportPdfReport } from '../services/api'

export default function ReportExportModal({ isOpen, onClose, report, code }) {
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  if (!isOpen || !report) return null

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const lang = report.language || 'code'
  const totalFindings = report.summary?.total_findings || 0
  const healthScore = report.health_score ?? 100
  const overallSeverity = report.overall_severity || 'low'
  const isBlocked = report.summary?.critical > 0 || report.summary?.high > 0

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 1. PDF Export
  const handleExportPDF = async () => {
    setIsExportingPdf(true)
    setErrorMsg(null)
    try {
      await exportPdfReport(report)
      setDownloadSuccess('PDF Report downloaded successfully!')
      setTimeout(() => setDownloadSuccess(null), 3500)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to generate PDF report.')
    } finally {
      setIsExportingPdf(false)
    }
  }

  // 2. Interactive Standalone HTML Report
  const handleExportHTML = () => {
    const findingsHtml = (report.findings || [])
      .map(
        (f, idx) => `
        <div class="finding-card ${f.severity}">
          <div class="finding-header">
            <span class="finding-title">#${idx + 1}. ${escapeHtml(f.title)}</span>
            <span class="badge ${f.severity}">${f.severity.toUpperCase()}</span>
          </div>
          <div class="finding-meta">
            <span><strong>Location:</strong> Line ${f.line ?? 'Global'}</span>
            <span><strong>Category:</strong> ${escapeHtml(f.category || 'General')}</span>
            <span><strong>Source:</strong> ${f.source_agent === 'security' ? 'Security Vulnerability Agent' : 'Code Quality Agent'}</span>
          </div>
          <p class="finding-desc">${escapeHtml(f.description)}</p>
          ${
            f.code_snippet
              ? `<div class="snippet-box"><pre><code>${escapeHtml(f.code_snippet)}</code></pre></div>`
              : ''
          }
        </div>
      `
      )
      .join('')

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Secoria Security Audit Report — ${escapeHtml(lang.toUpperCase())}</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #6366f1;
      --critical: #ef4444;
      --high: #f97316;
      --medium: #f59e0b;
      --low: #3b82f6;
      --pass: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 32px; line-height: 1.6; }
    .container { max-width: 960px; margin: 0 auto; }
    .header { border-bottom: 2px solid var(--border); padding-bottom: 24px; margin-bottom: 28px; }
    .header h1 { font-size: 26px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 12px; }
    .meta { font-size: 13px; color: var(--text-muted); margin-top: 6px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: center; }
    .stat-val { font-size: 32px; font-weight: 800; margin-top: 4px; }
    .stat-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .gate-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 700; margin-top: 6px; }
    .gate-passed { background: rgba(16, 185, 129, 0.15); color: var(--pass); border: 1px solid var(--pass); }
    .gate-blocked { background: rgba(239, 68, 68, 0.15); color: var(--critical); border: 1px solid var(--critical); }
    .section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #fff; border-left: 4px solid var(--accent); padding-left: 10px; }
    .finding-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 14px; border-left: 4px solid var(--low); }
    .finding-card.critical { border-left-color: var(--critical); }
    .finding-card.high { border-left-color: var(--high); }
    .finding-card.medium { border-left-color: var(--medium); }
    .finding-card.low { border-left-color: var(--low); }
    .finding-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .finding-title { font-size: 15px; font-weight: 700; color: #fff; }
    .badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
    .badge.critical { background: rgba(239, 68, 68, 0.2); color: var(--critical); }
    .badge.high { background: rgba(249, 115, 22, 0.2); color: var(--high); }
    .badge.medium { background: rgba(245, 158, 11, 0.2); color: var(--medium); }
    .badge.low { background: rgba(59, 130, 246, 0.2); color: var(--low); }
    .finding-meta { font-size: 12px; color: var(--text-muted); display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 10px; }
    .finding-desc { font-size: 13px; color: #d1d5db; }
    .snippet-box { margin-top: 10px; background: #030712; border: 1px solid #374151; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; overflow-x: auto; color: #fca5a5; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border); text-align: center; font-size: 12px; color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Secoria Security & Code Audit Report</h1>
      <div class="meta">
        Generated on ${new Date().toUTCString()} | Target Language: ${lang.toUpperCase()} | Engine: Secoria v1.0.0 Grounded in OWASP
      </div>
    </div>

    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">Code Health Score</div>
        <div class="stat-val" style="color: ${healthScore >= 85 ? 'var(--pass)' : healthScore >= 65 ? 'var(--medium)' : 'var(--critical)'}">${healthScore}/100</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Merge Gate Status</div>
        <div>
          <span class="gate-badge ${isBlocked ? 'gate-blocked' : 'gate-passed'}">
            ${isBlocked ? '🚨 BLOCKED' : '✅ PASSED'}
          </span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Critical / High Issues</div>
        <div class="stat-val" style="color: var(--critical)">${report.summary?.critical || 0} / ${report.summary?.high || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Findings Flagged</div>
        <div class="stat-val" style="color: var(--accent)">${totalFindings}</div>
      </div>
    </div>

    <div class="section-title">Detailed Findings Inventory (${totalFindings} Issues)</div>
    ${findingsHtml || '<p style="color: var(--pass); font-weight: 600;">✅ No security vulnerabilities or code smells detected.</p>'}

    <div class="footer">
      Secoria Code Inspection Platform &bull; Automated Security & Compliance Audit &bull; Confidential
    </div>
  </div>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    triggerDownload(blob, `secoria_security_audit_${lang}_${timestamp}.html`)
    setDownloadSuccess('Interactive HTML Report downloaded!')
    setTimeout(() => setDownloadSuccess(null), 3500)
  }

  // 3. DevSecOps JSON / SARIF Export
  const handleExportJSON = () => {
    const auditJson = {
      schema_version: 'secoria-audit-v1.0',
      timestamp: new Date().toISOString(),
      report_metadata: {
        scanner: 'Secoria AI Smart Code Inspection',
        version: '1.0.0',
        target_language: lang,
        health_score: healthScore,
        merge_gate: isBlocked ? 'BLOCKED' : 'PASSED',
        overall_severity: overallSeverity,
      },
      summary: report.summary,
      findings: (report.findings || []).map((f, i) => ({
        id: `SEC-${f.severity.toUpperCase().slice(0, 3)}-${i + 1}`,
        title: f.title,
        severity: f.severity,
        category: f.category,
        line: f.line,
        source_agent: f.source_agent,
        description: f.description,
        rule_id: f.rule_id || null,
        code_snippet: f.code_snippet || null,
        owasp_category: f.owasp_category || f.category || null,
      })),
    }

    const blob = new Blob([JSON.stringify(auditJson, null, 2)], { type: 'application/json;charset=utf-8;' })
    triggerDownload(blob, `secoria_audit_${lang}_${timestamp}.json`)
    setDownloadSuccess('DevSecOps JSON Report downloaded!')
    setTimeout(() => setDownloadSuccess(null), 3500)
  }

  // 4. Markdown Audit Report (.md)
  const handleExportMarkdown = () => {
    let md = `# 🛡️ Secoria Security & Code Audit Report\n\n`
    md += `**Generated:** ${new Date().toUTCString()}  \n`
    md += `**Target Language:** ${lang.toUpperCase()}  \n`
    md += `**Health Score:** ${healthScore}/100  \n`
    md += `**Merge Gate Status:** ${isBlocked ? '🚨 **BLOCKED (Requires Remediation)**' : '✅ **PASSED**'}  \n`
    md += `**Total Findings:** ${totalFindings} (Critical: ${report.summary?.critical || 0}, High: ${report.summary?.high || 0}, Medium: ${report.summary?.medium || 0}, Low: ${report.summary?.low || 0})\n\n`

    md += `## 📊 Executive Summary Table\n\n`
    md += `| Metric | Value | Status |\n`
    md += `| :--- | :---: | :--- |\n`
    md += `| **Health Score** | ${healthScore}/100 | ${healthScore >= 85 ? '🟢 Excellent' : healthScore >= 65 ? '🟡 Needs Work' : '🔴 Critical Risks'} |\n`
    md += `| **Critical Flaws** | ${report.summary?.critical || 0} | ${report.summary?.critical > 0 ? '❌ Must Fix Immediately' : '✅ Clean'} |\n`
    md += `| **High Flaws** | ${report.summary?.high || 0} | ${report.summary?.high > 0 ? '⚠️ High Priority' : '✅ Clean'} |\n`
    md += `| **Medium / Low** | ${(report.summary?.medium || 0) + (report.summary?.low || 0)} | ℹ️ Refactor & Cleanup |\n\n`

    md += `## 🔍 Detailed Findings Inventory\n\n`
    if (!report.findings || report.findings.length === 0) {
      md += `*✅ No vulnerabilities or code smells detected.*\n`
    } else {
      report.findings.forEach((f, idx) => {
        md += `### #${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}\n\n`
        md += `- **Location:** Line ${f.line ?? 'Global'}\n`
        md += `- **Category / OWASP:** ${f.category}\n`
        md += `- **Agent:** ${f.source_agent === 'security' ? 'Security Vulnerability Agent' : 'Code Quality Agent'}\n`
        md += `- **Description:** ${f.description}\n\n`
        if (f.code_snippet) {
          md += `\`\`\`${lang}\n${f.code_snippet.trim()}\n\`\`\`\n\n`
        }
      })
    }

    md += `## 🛠️ Prioritized Remediation Roadmap\n\n`
    md += `1. **Immediate Hotfix:** Remediate all SQL Injection and OS Command Injection vulnerabilities.\n`
    md += `2. **Credential Security:** Move raw API keys and passwords to environment variables (\`.env\`).\n`
    md += `3. **Refactoring:** Modularize high-complexity methods to improve maintainability.\n`
    md += `4. **CI/CD Enforce:** Run Secoria Automated PR bot to prevent future security regressions.\n`

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' })
    triggerDownload(blob, `secoria_audit_report_${lang}_${timestamp}.md`)
    setDownloadSuccess('Markdown Report downloaded!')
    setTimeout(() => setDownloadSuccess(null), 3500)
  }

  // 5. Comprehensive CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Finding ID',
      'Title',
      'Severity',
      'Category / OWASP',
      'Line Number',
      'Agent Source',
      'Description',
      'Resolution SLA',
    ]

    const rows = (report.findings || []).map((f, i) => {
      const sla =
        f.severity === 'critical'
          ? '24 Hours (Immediate)'
          : f.severity === 'high'
          ? '7 Days'
          : f.severity === 'medium'
          ? '14 Days'
          : 'Next Sprint'
      return [
        `SEC-${f.severity.toUpperCase().slice(0, 3)}-${i + 1}`,
        f.title,
        f.severity.toUpperCase(),
        f.category || 'General',
        f.line !== null ? f.line : 'Global',
        f.source_agent === 'security' ? 'Security Agent' : 'Code Quality Agent',
        f.description,
        sla,
      ]
    })

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
    triggerDownload(blob, `secoria_findings_${lang}_${timestamp}.csv`)
    setDownloadSuccess('CSV Spreadsheet downloaded!')
    setTimeout(() => setDownloadSuccess(null), 3500)
  }

  function escapeHtml(text) {
    if (!text) return ''
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0b0f19] shadow-[0_0_50px_rgba(79,70,229,0.25)] overflow-hidden text-slate-100 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#0f172a]/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25">
              <div className="w-full h-full rounded-[14px] bg-[#0b0f19] flex items-center justify-center text-indigo-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Export Security Audit Reports
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Multi-Format
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Download client-ready executive reports and machine-readable compliance exports
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feedback Alert */}
        {downloadSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <span>✅</span>
            <span className="font-bold">{downloadSuccess}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
            <span>⚠️</span>
            <span className="font-bold">{errorMsg}</span>
          </div>
        )}

        {/* Export Options Grid */}
        <div className="p-6 space-y-3.5">
          {/* 1. PDF Report */}
          <div className="p-4 rounded-2xl border border-white/10 bg-[#0e1424] hover:border-indigo-500/50 hover:bg-indigo-950/15 transition-all flex items-center justify-between group">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">📄</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Executive PDF Audit Report</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">Recommended</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full ReportLab PDF document with visual health gauges, SLA matrix, detailed findings, and remediation roadmap.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              {isExportingPdf ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Download PDF</span>
                  <span>↓</span>
                </>
              )}
            </button>
          </div>

          {/* 2. Interactive Standalone HTML */}
          <div className="p-4 rounded-2xl border border-white/10 bg-[#0e1424] hover:border-indigo-500/50 hover:bg-indigo-950/15 transition-all flex items-center justify-between group">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">🌐</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Interactive HTML Dashboard</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">Offline View</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Self-contained offline webpage with dark theme, responsive finding cards, and printable audit stylesheet.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportHTML}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>Download HTML</span>
              <span>↓</span>
            </button>
          </div>

          {/* 3. DevSecOps JSON / SARIF */}
          <div className="p-4 rounded-2xl border border-white/10 bg-[#0e1424] hover:border-indigo-500/50 hover:bg-indigo-950/15 transition-all flex items-center justify-between group">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">📊</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">DevSecOps JSON Compliance Export</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">CI/CD API</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Structured machine-readable JSON schema for pipeline integration, GitHub Code Scanning, or DefectDojo.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>Download JSON</span>
              <span>↓</span>
            </button>
          </div>

          {/* 4. Markdown & CSV Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Markdown */}
            <div className="p-3.5 rounded-2xl border border-white/10 bg-[#0e1424] flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-white flex items-center gap-1.5">
                  <span>📋</span> Markdown (.md)
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">For GitHub Wiki & Jira</p>
              </div>
              <button
                onClick={handleExportMarkdown}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all cursor-pointer"
              >
                Download .md
              </button>
            </div>

            {/* CSV */}
            <div className="p-3.5 rounded-2xl border border-white/10 bg-[#0e1424] flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-white flex items-center gap-1.5">
                  <span>📑</span> CSV Spreadsheet
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">With SLAs & CWE tags</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
              >
                Download .csv
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#080d1a] flex items-center justify-between text-xs text-slate-400">
          <span>Security Engine: <strong>Secoria v1.0.0</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
