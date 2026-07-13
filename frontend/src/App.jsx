import { useState } from 'react'
import CodeEditor from './components/CodeEditor'
import FileUpload from './components/FileUpload'
import ResultPanel from './components/ResultPanel'
import ThemeToggle from './components/ThemeToggle'
import { submitCode } from './services/api'

/**
 * App — top-level orchestrator.
 *
 * WHY DOES ALL STATE (mode, code, file, result, loading, error) LIVE HERE
 * INSTEAD OF INSIDE EACH CHILD COMPONENT?
 *   This is "lifting state up" — a core React pattern. The Submit button's
 *   enabled/disabled state depends on BOTH the code textarea AND the file
 *   upload. If each component managed its own state independently, there'd
 *   be no single place that knows "is there anything to submit right now?"
 *   Centralizing state here keeps child components "dumb" (presentation-only)
 *   and easy to test/reuse — they just receive props and call callbacks.
 */
export default function App() {
  const [mode, setMode] = useState('paste') // 'paste' | 'upload'
  const [code, setCode] = useState('')
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = mode === 'paste' ? code.trim().length > 0 : file !== null

  async function handleSubmit() {
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const response =
        mode === 'paste' ? await submitCode({ code }) : await submitCode({ file })
      setResult(response)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  function switchMode(newMode) {
    setMode(newMode)
    setResult(null)
    setError(null)
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
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Code Submission</h1>
        <p className="mt-1 text-[var(--color-text-secondary)]">
          Paste or upload Python / Java source code for language detection and syntax validation.
        </p>

        {/* Mode toggle */}
        <div className="mt-6 inline-flex rounded-lg border border-[var(--color-border)] p-1">
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

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            {mode === 'paste' ? (
              <CodeEditor value={code} onChange={setCode} disabled={isLoading} />
            ) : (
              <FileUpload onFileSelected={setFile} disabled={isLoading} />
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isLoading}
              className="mt-4 w-full rounded-lg bg-[var(--color-brand)] px-4 py-2.5 font-medium text-white
                         transition-colors hover:bg-[var(--color-brand-hover)]
                         disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {isLoading ? 'Analyzing…' : 'Submit for Analysis'}
            </button>
          </div>

          <ResultPanel result={result} isLoading={isLoading} error={error} />
        </div>
      </main>
    </div>
  )
}
