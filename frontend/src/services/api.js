/**
 * API client — the ONLY file in the frontend that knows the backend's URL
 * and endpoint shape.
 *
 * WHY CENTRALIZE THIS INSTEAD OF CALLING fetch() DIRECTLY IN COMPONENTS?
 *   If the backend URL changes (e.g., deployed to a real domain instead of
 *   localhost), or Milestone 2 adds new endpoints (analyze, chat), we edit
 *   ONE file. Components stay unaware of HTTP details entirely — they just
 *   call `submitCode(...)` and get back clean data or a thrown error.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Submits code (either pasted text or an uploaded file) to the backend.
 *
 * @param {{ code?: string, file?: File }} params - exactly one of code/file must be provided
 * @returns {Promise<{language: string, is_valid: boolean, error: string|null, filename: string|null}>}
 */
export async function submitCode({ code, file }) {
  const formData = new FormData()
  if (code !== undefined) formData.append('code', code)
  if (file !== undefined) formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/submit`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Runs the Security Vulnerability Agent on code that has already passed
 * syntax validation via submitCode(). Kept as a SEPARATE call (not bundled
 * into submitCode) because the backend itself keeps these as two distinct
 * agents/endpoints -- the frontend's API shape should mirror that
 * separation rather than hide it.
 *
 * @param {{ code?: string, file?: File }} params - exactly one of code/file must be provided
 * @returns {Promise<{language: string, findings: Array, summary: Object, overall_severity: string}>}
 */
export async function scanSecurity({ code, file }) {
  const formData = new FormData()
  if (code !== undefined) formData.append('code', code)
  if (file !== undefined) formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/security-scan`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Runs the full Orchestrated Review — Code Analysis + Security agents,
 * dispatched concurrently on the backend, merged into one prioritized,
 * deduplicated findings list. This is now the SINGLE entry point for
 * code review in the UI (the Findings Display & Severity Scoring
 * Module), replacing separate calls to submitCode()/scanSecurity() for
 * the main review flow -- language detection and syntax validation
 * happen internally on the backend before either agent runs.
 *
 * @param {{ code?: string, file?: File }} params - exactly one of code/file must be provided
 * @returns {Promise<{language: string, findings: Array, summary: Object, overall_severity: string}>}
 */
export async function runReview({ code, file }) {
  const formData = new FormData()
  if (code !== undefined) formData.append('code', code)
  if (file !== undefined) formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/review`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Requests remediation suggestions (explanation, fixed code, best practices)
 * for a single finding from the FastAPI backend.
 *
 * @param {{
 *   finding_title: string,
 *   finding_description: string,
 *   code_snippet: string,
 *   language: string,
 *   full_code?: string
 * }} params
 * @returns {Promise<{
 *   finding_title: string,
 *   remediation: {
 *     explanation: string,
 *     fixed_code: string,
 *     best_practice_notes: string
 *   }
 * }>}
 */
export async function remediateFinding({
  finding_title,
  finding_description,
  code_snippet,
  language,
  full_code,
}) {
  const response = await fetch(`${API_BASE_URL}/api/remediate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      finding_title,
      finding_description,
      code_snippet,
      language,
      full_code: full_code || null,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail || `Remediation failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Sends a message to the RAG Conversational Assistant (Milestone 3).
 *
 * @param {{
 *   message: string,
 *   finding_title?: string,
 *   code_snippet?: string,
 *   history: Array<{role: 'user'|'assistant', content: string}>
 * }} params
 * @returns {Promise<{
 *   reply: string,
 *   sources: Array<{source: string, page?: number, content_snippet?: string}>
 * }>}
 */
export async function sendChatMessage({
  message,
  finding_title,
  code_snippet,
  history = [],
}) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      finding_title: finding_title || null,
      code_snippet: code_snippet || null,
      history,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail || `Chat request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Generates a markdown Pull Request review summary comment (Milestone 3).
 *
 * @param {Object} report The complete UnifiedReviewReport object
 * @returns {Promise<{markdown: string}>}
 */
export async function generatePRSummary(report) {
  const response = await fetch(`${API_BASE_URL}/api/pr-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(report),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(
      errorBody.detail || `PR summary compilation failed with status ${response.status}`
    )
  }

  return response.json()
}

/**
 * Downloads an exportable PDF report for the code review scan (Milestone 4).
 *
 * @param {Object} report The complete UnifiedReviewReport object
 * @returns {Promise<void>} Triggers browser file download
 */
export async function exportPdfReport(report) {
  const response = await fetch(`${API_BASE_URL}/api/report/pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(report),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(
      errorBody.detail || `PDF export failed with status ${response.status}`
    )
  }

  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  link.download = `secoria_code_review_report_${timestamp}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}

/**
 * Auto-remediates the entire codebase in one click, resolving all findings
 * and producing clean source code with a changelog and projected score.
 *
 * @param {{
 *   full_code: string,
 *   language: string,
 *   findings: Array,
 *   health_score?: number
 * }} params
 * @returns {Promise<{
 *   remediated_code: string,
 *   changelog: Array<string>,
 *   original_score: number,
 *   projected_score: number,
 *   fixed_count: number,
 *   summary: string
 * }>}
 */
export async function autoRemediateAll({ full_code, language, findings, health_score }) {
  const response = await fetch(`${API_BASE_URL}/api/remediate-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      full_code,
      language,
      findings: findings || [],
      health_score: health_score || 100,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(
      errorBody.detail || `Auto-remediation failed with status ${response.status}`
    )
  }

  return response.json()
}

/**
 * Simulates or executes a GitHub Pull Request review from PR URL or raw Git diff patch.
 *
 * @param {{
 *   pr_url?: string,
 *   diff_patch?: string,
 *   github_token?: string,
 *   post_to_github?: boolean
 * }} params
 */
export async function simulatePRReview({ pr_url, diff_patch, github_token, post_to_github = false }) {
  const response = await fetch(`${API_BASE_URL}/api/github/simulate-pr-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pr_url: pr_url || null,
      diff_patch: diff_patch || null,
      github_token: github_token || null,
      post_to_github,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(
      errorBody.detail || `GitHub PR review failed with status ${response.status}`
    )
  }

  return response.json()
}



