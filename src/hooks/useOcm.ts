import { useState, useCallback, useRef } from 'react'

// ── OCM Types (from API response) ─────────────────────────────────────

export interface OcmConnection {
  ConnectionTypeID: number
  ConnectionType?: { Title?: string }
  PowerKW?: number
  LevelID?: number
  Level?: { Title?: string }
  Quantity?: number
}

export interface OcmPoi {
  ID: number
  AddressInfo: {
    Title: string
    AddressLine1?: string
    Town?: string
    StateOrProvince?: string
    Latitude: number
    Longitude: number
    Distance?: number
    RelatedURL?: string
  }
  Connections?: OcmConnection[]
  OperatorInfo?: { Title?: string }
  StatusType?: { Title?: string; IsOperational?: boolean }
  UsageCost?: string
  NumberOfPoints?: number
  DateLastStatusUpdate?: string
}

// ── Normalized POI shape used throughout the app ─────────────────────

export interface StationPoi {
  pid: string
  name: string
  addr: string
  lat: number
  lng: number
  distanceKm: number | null
  direction: string | null   // e.g. 'N', 'NE', 'SW'
  operator: string
  connections: { type: string; kw: number | null; level: string }[]
  maxKw: number
  isFast: boolean
  isChargeQ: boolean
  statusText: string
  isOpen: boolean
  plugCount: number
}

// ── Bearing / direction helper ────────────────────────────────────────
function getBearing(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  const dLng = (toLng - fromLng) * Math.PI / 180
  const lat1 = fromLat * Math.PI / 180
  const lat2 = toLat * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(bearing / 45) % 8]
}

// ── Normalize raw OCM response → StationPoi ───────────────────────────

const CHARGEQ_OPERATOR_IDS = new Set([9999]) // placeholder — set real IDs after deployment

function normalizeOcm(poi: OcmPoi, userLat: number, userLng: number): StationPoi {
  const addr = [
    poi.AddressInfo.AddressLine1,
    poi.AddressInfo.Town,
    poi.AddressInfo.StateOrProvince,
  ]
    .filter(Boolean)
    .join(', ')

  const connections = (poi.Connections ?? []).map((c) => ({
    type:  c.ConnectionType?.Title ?? 'Unknown',
    kw:    c.PowerKW ?? null,
    level: c.Level?.Title ?? '',
  }))

  const maxKw = Math.max(0, ...connections.map((c) => c.kw ?? 0))
  const isFast = maxKw >= 22

  // Distance via Haversine if not provided by OCM
  let distanceKm: number | null = poi.AddressInfo.Distance ?? null
  if (distanceKm === null) {
    const R = 6371
    const dLat = ((poi.AddressInfo.Latitude - userLat) * Math.PI) / 180
    const dLng = ((poi.AddressInfo.Longitude - userLng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((userLat * Math.PI) / 180) *
        Math.cos((poi.AddressInfo.Latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const isOperational = poi.StatusType?.IsOperational ?? true
  const statusText = poi.StatusType?.Title ?? 'Unknown'

  return {
    pid:        `ocm_${poi.ID}`,
    name:       poi.AddressInfo.Title,
    addr,
    lat:        poi.AddressInfo.Latitude,
    lng:        poi.AddressInfo.Longitude,
    distanceKm: Math.round(distanceKm * 10) / 10,
    direction:  getBearing(userLat, userLng, poi.AddressInfo.Latitude, poi.AddressInfo.Longitude),
    operator:   poi.OperatorInfo?.Title ?? 'Unknown operator',
    connections,
    maxKw,
    isFast,
    isChargeQ:  CHARGEQ_OPERATOR_IDS.has(0), // update with real operator ID
    statusText,
    isOpen:     isOperational,
    plugCount:  poi.NumberOfPoints ?? connections.length,
  }
}

// ── Hook: fetch nearby stations via Edge Function ─────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export function useOcmStations() {
  const [stations, setStations] = useState<StationPoi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Map<string, StationPoi[]>>(new Map())

  const fetchStations = useCallback(async (lat: number, lng: number, radiusKm = 15) => {
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)},${radiusKm}`
    const cached = cacheRef.current.get(cacheKey)
    if (cached) { setStations(cached); return }

    setLoading(true)
    setError(null)

    try {
      const edgeFnUrl = `${SUPABASE_URL}/functions/v1/ocm-proxy?lat=${lat}&lng=${lng}&radius=${radiusKm}&maxResults=100`
      const res = await fetch(edgeFnUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: OcmPoi[] = await res.json()
      if (!Array.isArray(data)) throw new Error('Invalid response')

      const normalized = data
        .map((poi) => normalizeOcm(poi, lat, lng))
        .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))

      cacheRef.current.set(cacheKey, normalized)
      setStations(normalized)
    } catch (err) {
      setError('Could not load stations. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  return { stations, loading, error, fetchStations }
}

// ── Geolocation helper ────────────────────────────────────────────────

export const SYDNEY_FALLBACK = { lat: -33.93, lng: 151.18 }

export function getUserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(SYDNEY_FALLBACK)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(SYDNEY_FALLBACK),
      { timeout: 7000, enableHighAccuracy: false }
    )
  })
}

// ── Format helpers ────────────────────────────────────────────────────

export function formatDistance(km: number | null): string {
  if (km === null) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export function estimatedDriveMins(km: number | null): number {
  if (km === null) return 0
  return Math.ceil((km / 30) * 60) // assumes 30 km/h average urban speed
}

export function availabilityLabel(station: StationPoi): 'avail' | 'mod' | 'busy' {
  // We don't have live bay count from OCM — use heuristic
  if (!station.isOpen) return 'busy'
  if (station.plugCount >= 4) return 'avail'
  return 'mod'
}
