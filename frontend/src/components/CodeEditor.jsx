import { useState, useEffect, useRef } from 'react'
import CodeEditorModule from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'

const Editor = CodeEditorModule.default || CodeEditorModule

const LANGUAGES = {
  python: { label: 'Python', icon: '🐍', grammar: Prism.languages.python },
  java: { label: 'Java', icon: '☕', grammar: Prism.languages.java },
}

export default function CodeEditor({ value, onChange, disabled }) {
  const [highlightLang, setHighlightLang] = useState('python')
  const [copied, setCopied] = useState(false)
  const [isWrap, setIsWrap] = useState(true)
  const editorContainerRef = useRef(null)

  // Auto-detect Python vs Java from code content
  useEffect(() => {
    if (!value) return
    const isJava = /(public\s+class|System\.out\.println|import\s+java\.|package\s+[a-z0-9_.]+;)/i.test(value)
    const isPython = /(def\s+[a-z0-9_]+\s*\(|import\s+os|import\s+sqlite3|elif\s+|class\s+[A-Za-z0-9_]+:)/i.test(value)
    
    if (isJava && !isPython && highlightLang !== 'java') {
      setHighlightLang('java')
    } else if (isPython && !isJava && highlightLang !== 'python') {
      setHighlightLang('python')
    }
  }, [value])

  const lines = value ? value.split('\n') : ['']
  const lineCount = lines.length
  const charCount = value ? value.length : 0
  const byteSize = value ? new Blob([value]).size : 0

  function handleCopy() {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleClear() {
    if (onChange) {
      onChange('')
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-500/5 transition-all">
      {/* Sleek IDE Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* macOS / VS Code Window Control Dots */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-rose-400 ring-1 ring-rose-400/40" />
            <span className="h-3 w-3 rounded-full bg-amber-400 ring-1 ring-amber-400/40" />
            <span className="h-3 w-3 rounded-full bg-emerald-400 ring-1 ring-emerald-400/40" />
          </div>

          {/* Language Mode Selector Pills */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 p-0.5 ml-1 shadow-xs">
            {Object.entries(LANGUAGES).map(([key, { label, icon }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setHighlightLang(key)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  highlightLang === key
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          <span className="hidden sm:inline text-xs font-mono font-bold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-3">
            {highlightLang === 'python' ? 'main.py' : 'Application.java'}
          </span>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Wrap toggle */}
          <button
            type="button"
            onClick={() => setIsWrap(!isWrap)}
            title="Toggle word wrap"
            className={`hidden sm:inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-all cursor-pointer ${
              isWrap
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            <span>Wrap: {isWrap ? 'ON' : 'OFF'}</span>
          </button>

          {/* Clear button */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear editor contents"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 shadow-xs transition-all cursor-pointer"
            >
              <span>✕</span>
              <span>Clear</span>
            </button>
          )}

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            title="Copy code to clipboard"
            className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body with Synchronized Line Numbers Gutter */}
      <div
        ref={editorContainerRef}
        className="flex min-h-[320px] max-h-[540px] overflow-auto font-mono text-xs sm:text-[13px] bg-white dark:bg-[#0d1117] text-slate-900 dark:text-slate-100 transition-colors"
      >
        {/* Line Numbers Column Gutter */}
        <div
          aria-hidden="true"
          className="select-none sticky left-0 z-10 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#090d16] px-3.5 py-4 text-right font-mono text-xs text-slate-400 dark:text-slate-500 backdrop-blur-sm"
          style={{ lineHeight: '1.5rem', minWidth: '3.2rem' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="hover:text-indigo-500 transition-colors">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Input Area */}
        <div className={`flex-1 py-4 px-4 min-w-0 ${!isWrap ? 'overflow-x-auto whitespace-pre' : ''}`}>
          <Editor
            value={value}
            onValueChange={onChange}
            highlight={(code) =>
              Prism.highlight(code, LANGUAGES[highlightLang].grammar, highlightLang)
            }
            disabled={disabled}
            padding={0}
            placeholder={`// Paste your ${LANGUAGES[highlightLang].label} code here...\n// Or choose a pre-configured demo sample above!`}
            style={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: '1.5rem',
              color: 'inherit',
              minHeight: '100%',
              tabSize: 4,
            }}
            textareaClassName="focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 leading-6"
          />
        </div>
      </div>

      {/* IDE Status Bar Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900 text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {LANGUAGES[highlightLang].label}
          </span>
          <span className="hidden sm:inline border-l border-slate-300 dark:border-slate-700 pl-3">
            UTF-8
          </span>
          <span className="hidden sm:inline border-l border-slate-300 dark:border-slate-700 pl-3">
            Spaces: 4
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>{lineCount} lines</span>
          <span>·</span>
          <span>{charCount} chars</span>
          {byteSize > 0 && (
            <>
              <span>·</span>
              <span className="hidden sm:inline">{(byteSize / 1024).toFixed(1)} KB</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
