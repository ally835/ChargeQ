// ============================================================
// ChargeQ — Core Domain Types
// Derived directly from V2 prototype data shapes
// ============================================================

// ── Auth ──────────────────────────────────────────────────

export type ChargerType = 'ccs2' | 'type2' | 'chd' | 'tesla'
export type PortSide = 'fl' | 'fr' | 'rl' | 'rr' | 'dm' | 'pm' | 'fc'

export interface Vehicle {
  id: string
  plate: string
  nick: string
  charger: ChargerType
  portSide?: PortSide
  isDefault: boolean
}

export interface User {
  id: string
  name: string
  phone: string           // E.164 format: +614XXXXXXXX
  since: string
  sessions: number
  vehicles: Vehicle[]
  selectedVehicleId: string | null
}

// ── Site ──────────────────────────────────────────────────

export interface SiteInfo {
  key: string
  name: string
  addr: string
}

// ── Queue ─────────────────────────────────────────────────

export type QueueStatus = 'waiting' | 'ready' | 'charging' | 'left'

export interface QueueEntry {
  id: string
  siteId: string
  siteName: string
  userId: string
  name: string
  phone: string
  plate: string
  charger: ChargerType
  portSide: PortSide
  bayNum: number | null
  position: number
  estimatedWaitMins: number
  status: QueueStatus
  isRemote: boolean
  joinedAt: string
}

// Client-side view of "my" queue entry
export interface MyQueueEntry {
  id: string
  siteId: string
  siteName: string
  plate: string
  charger: ChargerType
  bayNum: number | null
  position: number
  estimatedWaitMins: number
  status: QueueStatus
}

// ── Bay ───────────────────────────────────────────────────

export type BayStatus = 'free' | 'occupied' | 'fault'

export interface Bay {
  num: number
  type: ChargerType
  status: BayStatus
  plate: string | null
  faultType?: string
}

// ── Admin ─────────────────────────────────────────────────

export type AppMode = 'user' | 'admin' | 'superadmin'

export interface SiteManager {
  id: string
  name: string
  email: string
  sites: string[]
  company: string
  status: 'pending' | 'approved' | 'suspended'
}

// ── Station Finder ────────────────────────────────────────

export interface ChargerConnection {
  type: string
  kw: number | null
  level: string
}

export interface POI {
  pid: string
  name: string
  addr: string
  lat: number
  lng: number
  distanceKm: number | null
  operator: string
  connections: ChargerConnection[]
  maxKw: number
  isFast: boolean
  isChargeQ: boolean
  statusText: string
  openText: string
}

// ── Reports ───────────────────────────────────────────────

export type FaultType = 'not-charging' | 'display-broken' | 'vandalism' | 'cable-missing' | 'blocked' | 'other'

export interface FaultReport {
  id: string
  siteId: string
  bayNum: number | null
  faultType: FaultType
  description: string
  photoUrl: string | null
  reportedAt: string
  resolved: boolean
}

export interface BayTakenIncident {
  id: string
  siteId: string
  assignedBay: number
  offenderPlate: string | null
  notes: string | null
  reportedAt: string
}

export interface LocationFlag {
  id: string
  stationName: string
  reason: string
  notes: string | null
  lat: number | null
  lng: number | null
  reportedAt: string
}

// ── Feedback ──────────────────────────────────────────────

export interface Feedback {
  rating: number
  categories: string[]
  message: string
  contactConsent: boolean
}

// ── RPC Response shapes ───────────────────────────────────

export interface JoinQueueResult {
  entry_id: string
  position: number
  estimated_wait_mins: number
  bay_num: number | null
}

export interface VerifyPinResult {
  success: boolean
  error?: string
}
