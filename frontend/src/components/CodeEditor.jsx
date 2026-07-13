/**
 * Plain textarea for pasting code.
 *
 * WHY NOT A SYNTAX-HIGHLIGHTED EDITOR (e.g., Monaco/CodeMirror) IN MILESTONE 1?
 *   Milestone 1's ONLY job is capturing code and sending it to the backend
 *   for language detection + syntax validation. A full editor component
 *   (Monaco is ~5MB, CodeMirror needs language-mode packages) is a
 *   meaningful dependency and complexity increase that Milestone 1 doesn't
 *   need to justify. This is a clean seam: swapping <textarea> for
 *   <MonacoEditor> later is a LOCAL change to this one file — nothing
 *   else in the app needs to know or care.
 */
export default function CodeEditor({ value, onChange, disabled }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      spellCheck={false}
      placeholder="Paste your Python or Java code here..."
      className="h-72 w-full resize-none rounded-lg border border-[var(--color-border)]
                 bg-[var(--color-surface)] p-4 font-mono text-sm text-[var(--color-text-primary)]
                 placeholder:text-[var(--color-text-secondary)]
                 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]
                 disabled:opacity-50"
    />
  )
}
