import { useState } from 'react'
import CodeEditor from './components/CodeEditor'
import FileUpload from './components/FileUpload'
import FindingsDashboard from './components/FindingsDashboard'
import ChatSidebar from './components/ChatSidebar'
import ThemeToggle from './components/ThemeToggle'
import { runReview } from './services/api'

/**
 * Helper to read a browser File object as plain text.
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Failed to read file content'))
    reader.readAsText(file)
  })
}

/**
 * App — top-level orchestrator.
 */
export default function App() {
  const [mode, setMode] = useState('paste') // 'paste' | 'upload'
  const [code, setCode] = useState('')
  const [file, setFile] = useState(null)

  const [report, setReport] = useState(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewError, setReviewError] = useState(null)
  const [submittedCode, setSubmittedCode] = useState('')

  // Conversational Assistant (Milestone 3) UI States
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatContext, setChatContext] = useState(null)

  const canSubmit = mode === 'paste' ? code.trim().length > 0 : file !== null
  const hasResults = isReviewing || report !== null || reviewError !== null

  async function handleRunReview() {
    setIsReviewing(true)
    setReviewError(null)
    setReport(null)
    try {
      let codeText = ''
      if (mode === 'paste') {
        codeText = code
        const response = await runReview({ code })
        setReport(response)
      } else {
        if (!file) throw new Error('No file selected')
        codeText = await readFileAsText(file)
        const response = await runReview({ file })
        setReport(response)
      }
      setSubmittedCode(codeText)
    } catch (err) {
      setReviewError(err.message)
    } finally {
      setIsReviewing(false)
    }
  }

  // Handle Ask Assistant trigger from finding cards
  function handleAskAssistant(finding) {
    let snippet = finding.code_snippet
    if (!snippet && finding.line && submittedCode) {
      const lines = submittedCode.split('\n')
      snippet = lines[finding.line - 1] || ''
    }
    
    setChatContext({
      title: finding.title,
      code_snippet: snippet || '',
    })
    setIsChatOpen(true)
  }

  function handleClearChatContext() {
    setChatContext(null)
  }

  function switchMode(newMode) {
    setMode(newMode)
    setReport(null)
    setReviewError(null)
    setSubmittedCode('')
    setChatContext(null)
    setIsChatOpen(false)
  }

  function handleClear() {
    setCode('')
    setFile(null)
    setReport(null)
    setReviewError(null)
    setSubmittedCode('')
    setChatContext(null)
    setIsChatOpen(false)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] transition-colors">
      <header className="border-b border-[var(--color-border)] no-print">
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

      <main className="mx-auto max-w-5xl px-6 py-10 print-w-full">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] no-print">Code Review</h1>
        <p className="mt-1 text-[var(--color-text-secondary)] no-print">
          Paste or upload Python / Java source code for a full code quality and security review.
        </p>

        {/* Editor section — centered, compact width */}
        <div className="mx-auto mt-6 max-w-3xl no-print">
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
            <FindingsDashboard
              report={report}
              isLoading={isReviewing}
              error={reviewError}
              fullCode={submittedCode}
              onAskAssistant={handleAskAssistant}
            />
          </div>
        )}
      </main>

      {/* RAG Chat Sidebar (Milestone 3) */}
      <ChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialContext={chatContext}
        onClearContext={handleClearChatContext}
      />

      {/* Floating Chat Trigger Button */}
      {hasResults && !isChatOpen && (
        <button
          onClick={() => {
            setChatContext(null)
            setIsChatOpen(true)
          }}
          className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition duration-200 hover:scale-105 z-40 cursor-pointer flex items-center justify-center border border-indigo-400/20"
          title="Open secure coding assistant"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  )
}
