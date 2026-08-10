import { useState } from 'react'
import CodeEditorModule from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'

// react-simple-code-editor is published as an older CommonJS module.
// Vite's pre-bundling wraps it such that a plain default import can
// resolve to EITHER the actual Editor component OR the whole raw exports
// object (depending on the exact esbuild/Vite version's interop
// behavior) -- verified by directly inspecting Vite's generated dep
// shim, which returns `export default require_lib()` (the raw CJS
// exports object as a whole). This defensive fallback handles both
// shapes correctly: if CodeEditorModule is already the component,
// `.default` is undefined and we fall back to CodeEditorModule itself;
// if it's the wrapper object, `.default` correctly extracts the
// component.
const Editor = CodeEditorModule.default || CodeEditorModule

/**
 * Code editor with line numbers, syntax highlighting, and a copy button.
 *
 * WHY react-simple-code-editor INSTEAD OF A PLAIN <textarea> NOW?
 *   Milestone 1 deliberately used a plain textarea to avoid an early,
 *   unjustified dependency (documented in the Decision Log). Real syntax
 *   highlighting genuinely improves usability for a code-review tool, so
 *   this is a deliberate upgrade, not scope creep -- and at ~2KB, this
 *   library stays proportionate rather than jumping straight to a full
 *   editor like Monaco (~5MB) that Milestone 1 explicitly avoided.
 *
 * WHY A MANUAL LANGUAGE TOGGLE FOR HIGHLIGHTING, SEPARATE FROM THE
 * BACKEND'S AUTO-DETECTION?
 *   The backend only detects language AFTER submission. While typing,
 *   nothing has told the client which grammar to highlight with yet.
 *   Rather than guess client-side (duplicating the backend's heuristic
 *   and risking it disagreeing with the real detection), a small manual
 *   toggle gives the user direct, honest control over highlighting with
 *   zero ambiguity -- the backend's own detection remains the single
 *   source of truth for what language was ACTUALLY submitted.
 */

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
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Toolbar: language toggle (for highlighting) + copy + line count */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5">
        <div className="flex gap-1">
          {Object.entries(LANGUAGES).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setHighlightLang(key)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                highlightLang === key
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-text-secondary)]">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            title="Copy code"
            className="text-xs font-medium text-[var(--color-text-secondary)] transition-colors
                       hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Editor with line-number gutter. Both the gutter and the code
          scroll together because they're siblings inside ONE scrolling
          container, not two independently-scrolled elements -- avoiding
          the classic "line numbers drift out of sync" bug. */}
      <div className="flex h-64 overflow-auto font-mono text-sm">
        <div
          aria-hidden="true"
          className="select-none px-3 py-4 text-right text-[var(--color-text-secondary)]/60"
          style={{ lineHeight: '1.5rem' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="flex-1 py-4 pr-3">
          <Editor
            value={value}
            onValueChange={onChange}
            highlight={(code) => Prism.highlight(code, LANGUAGES[highlightLang].grammar, highlightLang)}
            disabled={disabled}
            padding={0}
            placeholder="Paste your Python or Java code here..."
            style={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: '1.5rem',
              color: 'var(--color-text-primary)',
              minHeight: '100%',
            }}
            textareaClassName="focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}
