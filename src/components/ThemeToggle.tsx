import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'

/** Storage can be unavailable (private windows, blocked site data, SSR), and
 *  reading it then *throws* rather than returning null — so every access is
 *  guarded and the toggle just falls back to following the OS. */
function readTheme(): Theme {
  try {
    const v = localStorage.getItem('hnsw-theme')
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('hnsw-theme', theme)
    } catch {
      // Nothing to do — the choice just will not survive a reload.
    }
  }, [theme])

  return (
    <div className="segmented" role="group" aria-label="Theme">
      {(['system', 'light', 'dark'] as const).map((t) => (
        <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>
          {t === 'system' ? 'auto' : t}
        </button>
      ))}
    </div>
  )
}
