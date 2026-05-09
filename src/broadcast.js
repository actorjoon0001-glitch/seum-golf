import { supabase, supabaseEnabled } from './supabase.js'

export const AUDIO_URL = '/audio/notice-golf.mp3'
export const INTERVAL_MS = 30 * 1000

const KEY_LAST = 'seum.broadcast.lastAt'
const KEY_ENABLED = 'seum.broadcast.enabled'
const KEY_VOLUME = 'seum.broadcast.volume'

const localChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('seum-broadcast')
    : null

let supaChannel = null
if (supabaseEnabled && supabase) {
  try {
    supaChannel = supabase.channel('seum-broadcast', {
      config: { broadcast: { self: false, ack: false } }
    })
    supaChannel.subscribe()
  } catch (e) {
    console.warn('Supabase realtime channel init failed', e)
    supaChannel = null
  }
}

const listeners = new Map() // type -> Set<fn>

function dispatch(type, payload) {
  // 자기 캐시 동기화 (cross-device 에서 받은 변화도 localStorage 에 반영)
  try {
    if (type === 'played' && payload?.at != null) localStorage.setItem(KEY_LAST, String(payload.at))
    if (type === 'enabled' && payload?.value != null) localStorage.setItem(KEY_ENABLED, String(payload.value))
    if (type === 'volume' && payload?.value != null) localStorage.setItem(KEY_VOLUME, String(payload.value))
  } catch {}
  const fns = listeners.get(type)
  if (fns) fns.forEach((fn) => {
    try { fn(payload) } catch (e) { console.error(e) }
  })
}

if (localChannel) {
  localChannel.addEventListener('message', (e) => {
    const data = e.data
    if (data && typeof data === 'object') dispatch(data.type, data.payload)
  })
}
if (supaChannel) {
  supaChannel.on('broadcast', { event: 'seum-event' }, (msg) => {
    const data = msg?.payload
    if (data && typeof data === 'object') dispatch(data.type, data.payload)
  })
}

function emit(type, payload = {}) {
  const data = { type, payload }
  try { localChannel?.postMessage(data) } catch {}
  if (supaChannel) {
    try { supaChannel.send({ type: 'broadcast', event: 'seum-event', payload: data }) } catch {}
  }
}

function read(key, def, parse) {
  try {
    const v = localStorage.getItem(key)
    if (v == null) return def
    return parse ? parse(v) : v
  } catch {
    return def
  }
}

export const broadcast = {
  AUDIO_URL,
  INTERVAL_MS,

  on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set())
    listeners.get(type).add(fn)
    return () => listeners.get(type)?.delete(fn)
  },

  getLastAt: () => read(KEY_LAST, 0, Number),
  setLastAt(t) {
    try { localStorage.setItem(KEY_LAST, String(t)) } catch {}
    emit('played', { at: t })
  },

  getEnabled: () => read(KEY_ENABLED, true, (v) => v === 'true'),
  setEnabled(b) {
    try { localStorage.setItem(KEY_ENABLED, String(b)) } catch {}
    emit('enabled', { value: b })
  },

  getVolume: () => {
    const v = read(KEY_VOLUME, 100, Number)
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 100
  },
  setVolume(v) {
    const clamped = Math.max(0, Math.min(100, Number(v) || 0))
    try { localStorage.setItem(KEY_VOLUME, String(clamped)) } catch {}
    emit('volume', { value: clamped })
  },

  triggerNow() {
    emit('playNow', {})
  }
}
