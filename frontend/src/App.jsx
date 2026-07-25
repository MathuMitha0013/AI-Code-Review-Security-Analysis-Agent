import { useState } from 'react'
import CodeEditor from './components/CodeEditor'
import FileUpload from './components/FileUpload'
import FindingsDashboard from './components/FindingsDashboard'
import ThemeToggle from './components/ThemeToggle'
import { runReview } from './services/api'

/**
 * App — top-level orchestrator.
 *
 * LAYOUT NOTE: the editor and results were originally a side-by-side
 * two-column grid. That wasted significant space -- the editor is
 * naturally compact, while a real findings list (severity cards, filter
 * row, multiple detailed findings with code snippets) needs more
 * horizontal room to be readable, not squeezed into half the page.
 *
 * The layout is now a single vertical flow: a centered, reasonably-
 * constrained editor section on top, and a FULL-WIDTH results section
 * below it that only appears once a review has actually been run (no
 * empty placeholder box wasting space before that).
 */
export default function App() {
  const [mode, setMode] = useState('paste') // 'paste' | 'upload'
  const [code, setCode] = useState('')
  const [file, setFile] = useState(null)

  const [report, setReport] = useState(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewError, setReviewError] = useState(null)

  const canSubmit = mode === 'paste' ? code.trim().length > 0 : file !== null
  const hasResults = isReviewing || report !== null || reviewError !== null

  async function handleRunReview() {
    setIsReviewing(true)
    setReviewError(null)
    setReport(null)
    try {
      const response = mode === 'paste' ? await runReview({ code }) : await runReview({ file })
      setReport(response)
    } catch (err) {
      setReviewError(err.message)
    } finally {
      setIsReviewing(false)
    }
  }

  function switchMode(newMode) {
    setMode(newMode)
    setReport(null)
    setReviewError(null)
  }

  function handleClear() {
    setCode('')
    setFile(null)
    setReport(null)
    setReviewError(null)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] transition-colors">
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)] font-bold text-white">
              S
            </div>
            <span className="text-lg font-semibold text-[var(--color-text-primary)]">Secoria</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Code Review</h1>
        <p className="mt-1 text-[var(--color-text-secondary)]">
          Paste or upload Python / Java source code for a full code quality and security review.
        </p>

        {/* Editor section — centered, compact width */}
        <div className="mx-auto mt-6 max-w-3xl">
          <div className="inline-flex rounded-lg border border-[var(--color-border)] p-1">
            {['paste', 'upload'].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors cursor-pointer ${
                  mode === m
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {mode === 'paste' ? (
              <CodeEditor value={code} onChange={setCode} disabled={isReviewing} />
            ) : (
              <FileUpload onFileSelected={setFile} disabled={isReviewing} />
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleRunReview}
              disabled={!canSubmit || isReviewing}
              className="flex-1 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 font-medium text-white
                         transition-colors hover:bg-[var(--color-brand-hover)]
                         disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {isReviewing ? 'Reviewing…' : 'Run Full Review'}
            </button>
            <button
              onClick={handleClear}
              disabled={isReviewing || (!code && !file && !report)}
              title="Clear code and results"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]
                         px-4 py-2.5 font-medium text-[var(--color-text-secondary)] transition-colors
                         hover:border-[var(--color-danger)]/40 hover:text-[var(--color-danger)]
                         disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results section — full width, only appears once a review has run */}
        {hasResults && (
          <div className="mt-8">
            <FindingsDashboard report={report} isLoading={isReviewing} error={reviewError} />
          </div>
        )}
      </main>
    </div>
  )
}
