import { initialState, type AppState } from './store'

const STORAGE_KEY = 'hnsw-explorer:session:v1'
const STORAGE_VERSION = 1

interface PersistedEnvelope {
  version: typeof STORAGE_VERSION
  state: AppState
}

function replacer(_key: string, value: unknown) {
  if (value instanceof Map) return { __hnswMap: [...value.entries()] }
  return value
}

function reviver(_key: string, value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    '__hnswMap' in value &&
    Array.isArray((value as { __hnswMap: unknown }).__hnswMap)
  ) {
    return new Map((value as { __hnswMap: Array<[unknown, unknown]> }).__hnswMap)
  }
  return value
}

export function serializeState(state: AppState): string {
  return JSON.stringify({ version: STORAGE_VERSION, state: { ...state, playing: false, movingNode: null } }, replacer)
}

export function deserializeState(raw: string): AppState | null {
  try {
    const envelope = JSON.parse(raw, reviver) as Partial<PersistedEnvelope>
    const candidate = envelope.state
    if (
      envelope.version !== STORAGE_VERSION ||
      !candidate ||
      !candidate.graph ||
      !(candidate.graph.nodes instanceof Map)
    ) {
      return null
    }

    const defaults = initialState()
    return {
      ...defaults,
      ...candidate,
      params: { ...defaults.params, ...candidate.params },
      dataset: { ...defaults.dataset, ...candidate.dataset },
      playing: false,
      movingNode: null,
    }
  } catch {
    return null
  }
}

export function loadPersistedState(): AppState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? deserializeState(raw) : null
  } catch {
    return null
  }
}

export function savePersistedState(state: AppState): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, serializeState(state))
  } catch {
    // A very long trace can exceed the browser's per-origin storage quota.
    // Preserve the graph and settings even when the replay history will not fit.
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        serializeState({ ...state, trace: null, step: 0, playing: false }),
      )
    } catch {
      // Storage may be disabled. The app remains fully usable for this page load.
    }
  }
}
