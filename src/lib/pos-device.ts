/**
 * Persistent identity of the physical cashier computer. A random token lives only in this
 * browser; the backend stores just its SHA-256 hash. It is not an operator credential.
 */
const KEY = 'rs_pos_device_token'

export function getDeviceToken(create = true): string | null {
  if (typeof window === 'undefined') return null
  let t = window.localStorage.getItem(KEY)
  if (!t && create) {
    const b = new Uint8Array(32); crypto.getRandomValues(b)
    t = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
    window.localStorage.setItem(KEY, t)
  }
  return t
}

export async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export async function getDeviceHash() {
  const t = getDeviceToken(true)
  return t ? sha256Hex(t) : null
}
