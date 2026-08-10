import { createContext, useContext, useEffect, useState } from 'react'

/**
 * ThemeContext — global dark/light mode state.
 *
 * WHY CONTEXT INSTEAD OF PROP DRILLING?
 *   The theme toggle lives in a header component, but potentially every
 *   component in the app needs to know the current theme eventually
 *   (e.g., a future syntax-highlighted code editor needs a dark/light
 *   theme variant). Passing `theme` as a prop through every component
 *   in the tree ("prop drilling") gets unmanageable fast. Context lets
 *   ANY component subscribe directly, no matter how deep it is.
 *
 * WHY NOT A STATE MANAGEMENT LIBRARY (Redux/Zustand)?
 *   For a single global boolean-ish value (theme), Context is the right
 *   tool — it's built into React, zero extra dependencies. Redux/Zustand
 *   earn their complexity when you have many interdependent pieces of
 *   global state (e.g., Milestone 3+ findings state, chat history). We
 *   are not there yet — adding Redux now would be premature (YAGNI).
 */

const ThemeContext = createContext(undefined)

const STORAGE_KEY = 'secoria-theme'

function getInitialTheme() {
  // 1. Respect a previously saved user choice
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved

  // 2. Fall back to the OS-level preference on first visit
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Custom hook so consuming components write:
 *   const { theme, toggleTheme } = useTheme()
 * instead of importing useContext + ThemeContext everywhere.
 * Also throws a clear error if used outside the provider — fails fast
 * during development instead of silently returning undefined.
 */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
