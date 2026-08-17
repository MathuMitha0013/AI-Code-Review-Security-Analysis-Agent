import { useState } from 'react'
import CodeEditorModule from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'

const Editor = CodeEditorModule.default || CodeEditorModule

const LANGUAGES = {
  python: { label: 'Python', grammar: Prism.languages.python },
  java: { label: 'Java', grammar: Prism.languages.java },
}

export default function CodeEditor({ value, onChange, disabled }) {
  const [highlightLang, setHighlightLang] = useState('python')
  const [copied, setCopied] = useState(false)

  const lineCount = value ? value.split('\n').length : 1

  function handleCopy() {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg shadow-black/5 transition-all">
      {/* Sleek IDE Header Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          {/* Window Control Dots */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 ring-1 ring-rose-500/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 ring-1 ring-amber-500/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 ring-1 ring-emerald-500/30" />
          </div>

          {/* Language Mode Toggle */}
          <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 ml-2">
            {Object.entries(LANGUAGES).map(([key, { label }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setHighlightLang(key)}
                className={`rounded-md px-2.5 py-0.5 text-xs font-semibold transition-all cursor-pointer ${
                  highlightLang === key
                    ? 'bg-[var(--color-brand)] text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-medium text-[var(--color-text-muted)]">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            title="Copy code"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] shadow-sm transition-all
                       hover:border-indigo-500/40 hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-emerald-500 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex min-h-[300px] max-h-[500px] overflow-auto font-mono text-sm">
        {/* Line Numbers Column */}
        <div
          aria-hidden="true"
          className="select-none border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)]/40 px-3 py-4 text-right font-mono text-xs text-[var(--color-text-muted)]"
          style={{ lineHeight: '1.5rem', minWidth: '2.75rem' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Input Area */}
        <div className="flex-1 py-4 px-4">
          <Editor
            value={value}
            onValueChange={onChange}
            highlight={(code) => Prism.highlight(code, LANGUAGES[highlightLang].grammar, highlightLang)}
            disabled={disabled}
            padding={0}
            placeholder={`Paste your ${LANGUAGES[highlightLang].label} code here to review...`}
            style={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: '1.5rem',
              color: 'var(--color-text-primary)',
              minHeight: '100%',
            }}
            textareaClassName="focus:outline-none placeholder:text-[var(--color-text-muted)]"
          />
        </div>
      </div>
    </div>
  )
}
