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
