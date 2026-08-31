import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'
const THEMES: Theme[] = ['system', 'light', 'dark']

function readTheme(): Theme {
  try {
    const value = localStorage.getItem('hnsw-theme')
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch { return 'system' }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('hnsw-theme', theme) } catch { /* session-only preference */ }
  }, [theme])

  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
  return (
    <button className="theme-toggle" onClick={() => setTheme(next)} aria-label={`Theme: ${theme}. Switch to ${next}.`} title={`Theme: ${theme}`}>
      <span aria-hidden="true">{theme === 'dark' ? '●' : theme === 'light' ? '○' : '◐'}</span>
      <span>{theme}</span>
    </button>
  )
}
