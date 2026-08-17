import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl
                 border border-[var(--color-border)] bg-[var(--color-surface)]
                 text-[var(--color-text-secondary)] shadow-sm transition-all duration-200
                 hover:text-[var(--color-text-primary)] hover:border-indigo-500/40 hover:scale-105 active:scale-95 cursor-pointer"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round" className="h-4 w-4 text-amber-400 animate-in spin-in-180 duration-300">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round" className="h-4 w-4 text-indigo-600 animate-in spin-in-180 duration-300">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  )
}
