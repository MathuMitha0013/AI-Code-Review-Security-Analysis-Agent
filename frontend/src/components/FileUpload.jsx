import { useRef, useState } from 'react'

const ACCEPTED_EXTENSIONS = ['.py', '.java']

/**
 * Drag-and-drop + click-to-browse file upload.
 *
 * WHY VALIDATE THE EXTENSION HERE TOO, IF THE BACKEND ALREADY VALIDATES?
 *   This is "defense in depth" applied to UX, not security: rejecting an
 *   obviously wrong file (e.g., a .png) INSTANTLY in the browser gives the
 *   user immediate feedback without a network round-trip. The backend
 *   validation remains the authoritative check — never trust client-side
 *   validation alone for anything security-relevant, but for UX it's
 *   valuable.
 */
export default function FileUpload({ onFileSelected, disabled }) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState(null)
  const [validationError, setValidationError] = useState(null)
  const inputRef = useRef(null)

  function validateAndSelect(file) {
    const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    )
    if (!hasValidExtension) {
      setValidationError('Only .py and .java files are accepted.')
      setSelectedFileName(null)
      return
    }
    setValidationError(null)
    setSelectedFileName(file.name)
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
        className={`flex h-72 w-full cursor-pointer flex-col items-center justify-center
                    rounded-lg border-2 border-dashed p-4 text-center transition-colors
                    ${isDragging ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5' : 'border-[var(--color-border)]'}
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
             strokeLinejoin="round" className="mb-3 h-10 w-10 text-[var(--color-text-secondary)]">
          <path d="M12 16V4M12 4L7 9M12 4l5 5" />
          <path d="M20 16.5v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
        </svg>
        {selectedFileName ? (
          <p className="font-medium text-[var(--color-text-primary)]">{selectedFileName}</p>
        ) : (
          <>
            <p className="text-[var(--color-text-primary)]">Drag & drop a file, or click to browse</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Accepts .py and .java (max 1MB)</p>
          </>
        )}
      </div>
      {validationError && (
        <p className="mt-2 text-sm text-[var(--color-danger)]">{validationError}</p>
      )}
    </div>
  )
}
