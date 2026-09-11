export const LEARN_REFERENCE_EVENT = 'hnsw-learn-reference'

const RETURN_KEY = 'hnsw-learn-return-point'
const RESTORE_KEY = 'hnsw-learn-restore-point'

type ScrollTarget = 'learn' | 'landing' | 'panel' | 'window'

export type LearnReturnPoint = {
  href: string
  scrollTarget: ScrollTarget
  scrollTop: number
}

function readPoint(key: string): LearnReturnPoint | null {
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Partial<LearnReturnPoint> | null
    if (!value || typeof value.href !== 'string' || typeof value.scrollTop !== 'number') return null
    if (!['learn', 'landing', 'panel', 'window'].includes(value.scrollTarget ?? '')) return null
    return value as LearnReturnPoint
  } catch {
    return null
  }
}

function writePoint(key: string, point: LearnReturnPoint | null) {
  try {
    if (point) sessionStorage.setItem(key, JSON.stringify(point))
    else sessionStorage.removeItem(key)
  } catch {
    // Session storage is optional; navigation still works without restoration.
  }
}

function scrollOrigin(anchor: HTMLAnchorElement): Pick<LearnReturnPoint, 'scrollTarget' | 'scrollTop'> {
  const element = anchor.closest<HTMLElement>('.explanation-page, .landing-page, .pane-scroll')
  if (element?.classList.contains('explanation-page')) return { scrollTarget: 'learn', scrollTop: element.scrollTop }
  if (element?.classList.contains('landing-page')) return { scrollTarget: 'landing', scrollTop: element.scrollTop }
  if (element?.classList.contains('pane-scroll')) return { scrollTarget: 'panel', scrollTop: element.scrollTop }
  return { scrollTarget: 'window', scrollTop: window.scrollY }
}

export function readLearnReturnPoint() {
  return readPoint(RETURN_KEY)
}

export function rememberLearnReferenceOrigin(anchor: HTMLAnchorElement) {
  const existing = readLearnReturnPoint()
  const point = existing ?? {
    href: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    ...scrollOrigin(anchor),
  }
  writePoint(RETURN_KEY, point)
  window.dispatchEvent(new CustomEvent<LearnReturnPoint>(LEARN_REFERENCE_EVENT, { detail: point }))
}

export function followLearnReference(event: ReactMouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const url = new URL(event.currentTarget.href, window.location.href)
  if (url.origin !== window.location.origin || url.pathname !== '/learn' || !url.hash || url.href === window.location.href) return
  rememberLearnReferenceOrigin(event.currentTarget)
  event.preventDefault()
  window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function prepareLearnReturn(point: LearnReturnPoint) {
  writePoint(RETURN_KEY, null)
  writePoint(RESTORE_KEY, point)
}

export function restorePendingLearnReturn() {
  const point = readPoint(RESTORE_KEY)
  if (!point) return
  const here = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (here !== point.href) return

  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    const selector = point.scrollTarget === 'learn' ? '.explanation-page'
      : point.scrollTarget === 'landing' ? '.landing-page'
        : point.scrollTarget === 'panel' ? '.pane-scroll'
          : null
    const target = selector ? document.querySelector<HTMLElement>(selector) : null
    if (target) target.scrollTop = point.scrollTop
    else window.scrollTo({ top: point.scrollTop })
    writePoint(RESTORE_KEY, null)
  }))
}
import type { MouseEvent as ReactMouseEvent } from 'react'
