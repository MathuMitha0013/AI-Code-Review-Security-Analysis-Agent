import { useRef, useState } from 'react'

const ACCEPTED_EXTENSIONS = ['.py', '.java']

export default function FileUpload({ onFileSelected, disabled }) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState(null)
  const [selectedFileSize, setSelectedFileSize] = useState(null)
  const [validationError, setValidationError] = useState(null)
  const inputRef = useRef(null)

  function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  function validateAndSelect(file) {
    const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    )
    if (!hasValidExtension) {
      setValidationError('Only .py and .java files are supported.')
      setSelectedFileName(null)
      setSelectedFileSize(null)
      return
    }
    setValidationError(null)
    setSelectedFileName(file.name)
    setSelectedFileSize(formatBytes(file.size))
    onFileSelected(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSelect(file)
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0]
    if (file) validateAndSelect(file)
  }

  function handleRemoveFile(e) {
    e.stopPropagation()
    setSelectedFileName(null)
    setSelectedFileSize(null)
    setValidationError(null)
    onFileSelected(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative flex min-h-[280px] w-full cursor-pointer flex-col items-center justify-center
                    rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200
                    ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01] shadow-lg shadow-indigo-500/10'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/40 hover:bg-indigo-500/[0.02]'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".py,.java"
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {selectedFileName ? (
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-3">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-bold text-[var(--color-text-primary)]">{selectedFileName}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{selectedFileSize}</p>

            <button
              type="button"
              onClick={handleRemoveFile}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-500/20 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Change File</span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 mb-3">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-base font-bold text-[var(--color-text-primary)]">
              Drag & drop source file, or <span className="text-indigo-500 underline underline-offset-2">browse</span>
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Supports <code className="font-mono text-indigo-400 font-semibold">.py</code> and <code className="font-mono text-indigo-400 font-semibold">.java</code> files (Max 1MB)
            </p>
          </>
        )}
      </div>

      {validationError && (
        <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-rose-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{validationError}</span>
        </div>
      )}
    </div>
  )
}
