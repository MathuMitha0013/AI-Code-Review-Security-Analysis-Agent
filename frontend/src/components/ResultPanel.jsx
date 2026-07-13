/**
 * Displays the backend's SubmissionResponse: language, validity, error.
 *
 * WHY A SEPARATE COMPONENT INSTEAD OF INLINING THIS IN App.jsx?
 *   This component's shape mirrors the backend's `SubmissionResponse`
 *   schema almost 1:1. When Milestone 3 adds severity-scored findings,
 *   THIS is the component that grows — App.jsx's job (orchestrating
 *   state, calling the API) stays untouched. Isolating "how do we DISPLAY
 *   a result" from "how do we GET a result" is the same separation of
 *   concerns we applied on the backend (api/ vs services/).
 */
export default function ResultPanel({ result, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-[var(--color-text-secondary)]">Analyzing submission…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-6">
        <p className="font-medium text-[var(--color-danger)]">Request failed</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{error}</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center">
        <p className="text-[var(--color-text-secondary)]">
          Submit code to see the detected language and syntax validation result here.
        </p>
      </div>
    )
  }

  const { language, is_valid: isValid, error: syntaxError, filename } = result

  return (
    <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-secondary)]">Detected language</span>
        <span className="rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-sm font-medium capitalize text-[var(--color-brand)]">
          {language}
        </span>
      </div>

      {filename && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-secondary)]">Filename</span>
          <span className="font-mono text-sm text-[var(--color-text-primary)]">{filename}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-secondary)]">Syntax</span>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            isValid
              ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
              : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
          }`}
        >
          {isValid ? 'Valid' : 'Invalid'}
        </span>
      </div>

      {syntaxError && (
        <div className="rounded-md bg-[var(--color-danger)]/5 p-3">
          <p className="font-mono text-xs text-[var(--color-danger)]">{syntaxError}</p>
        </div>
      )}
    </div>
  )
}
