import type { ChargerType, PortSide } from '@/types'

// ── Phone normalization ────────────────────────────────────────────────

/**
 * Normalize an Australian mobile to E.164 format (+614XXXXXXXX).
 * Accepts: "0411 111 111", "0411111111", "+61411111111"
 */
export function normalizePhone(phone: string): string {
  const s = phone.replace(/[\s\-()]/g, '')
  if (s.startsWith('+')) return s
  if (s.startsWith('61') && s.length === 11) return '+' + s
  if (s.startsWith('0') && s.length === 10) return '+61' + s.slice(1)
  return s
}

/**
 * Validate Australian mobile (04XXXXXXXX or +614XXXXXXXX)
 */
export function isValidAuMobile(phone: string): boolean {
  const s = phone.replace(/\s/g, '')
  return /^04\d{8}$/.test(s) || /^\+614\d{8}$/.test(s)
}

// ── Charger display data ───────────────────────────────────────────────

export const CHARGER_INFO: Record<ChargerType, { icon: string; name: string; speed: string }> = {
  ccs2:  { icon: '⚡', name: 'CCS2 / DC Fast', speed: '50–350 kW' },
  type2: { icon: '🔌', name: 'Type 2 / AC',    speed: '7–22 kW' },
  chd:   { icon: '🔗', name: 'CHAdeMO',         speed: '50–100 kW' },
  tesla: { icon: '🚗', name: 'Tesla / NACS',    speed: 'Up to 250 kW' },
}

export const PORT_INFO: Record<PortSide, { label: string; icon: string }> = {
  fl: { label: 'Front left',    icon: '↖' },
  fr: { label: 'Front right',   icon: '↗' },
  rl: { label: 'Rear left',     icon: '↙' },
  rr: { label: 'Rear right',    icon: '↘' },
  dm: { label: 'Driver side',   icon: '←' },
  pm: { label: 'Passenger side', icon: '→' },
  fc: { label: 'Front centre',  icon: '↑' },
}

/**
 * Default bay assignment by charger type.
 * In production this comes from the bays table.
 * This is a fallback only.
 */
export const CHARGER_DEFAULT_BAY: Record<ChargerType, number> = {
  ccs2: 1, type2: 2, chd: 4, tesla: 6,
}

// ── Formatting helpers ─────────────────────────────────────────────────

export function formatWaitTime(mins: number): string {
  if (mins <= 0) return 'Ready now'
  if (mins < 60) return `~${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`
}

export function formatDistance(km: number | null): string {
  if (km === null) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Email validation ───────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// ── Misc ───────────────────────────────────────────────────────────────

/** Simple HTML escape to prevent XSS in dynamic content */
export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
