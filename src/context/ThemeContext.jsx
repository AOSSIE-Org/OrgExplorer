import { createContext, useContext, useState, useEffect } from 'react'

const ThemeCtx = createContext(null)

export function ThemeProvider({ children }) {

  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('oe_theme')

      if (stored === 'dark' || stored === 'light') {
        return stored
      }

      if (stored) {
        console.warn(`Invalid theme value found in localStorage: "${stored}". Falling back to 'dark'.`)
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error)
    }

    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('oe_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
