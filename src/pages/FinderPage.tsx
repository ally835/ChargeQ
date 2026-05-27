import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useOcmStations, getUserLocation, SYDNEY_FALLBACK, formatDistance, estimatedDriveMins } from '@/hooks/useOcm'
import type { StationPoi } from '@/hooks/useOcm'
import { StationCard } from '@/components/finder/StationCard'
import { StationDetailPanel } from '@/components/finder/StationDetailPanel'

// ── Fix Leaflet default icon path (Vite build issue) ─────────────────
delete (L.Icon.Default.prototype as unknown as Record<string,unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ── Custom map markers ────────────────────────────────────────────────

const makeMarker = (color: string, size = 28) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${color};
      border:2px solid rgba(255,255,255,0.9);
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })

const MARKER_CQ   = makeMarker('#1D9E75', 32)
const MARKER_FAST = makeMarker('#378ADD', 26)
const MARKER_SLOW = makeMarker('#5DCAA5', 22)
const MARKER_USER = L.divIcon({
  className: '',
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#1D9E75;border:3px solid #fff;
    box-shadow:0 0 0 4px rgba(29,158,117,0.25);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function markerFor(station: StationPoi) {
  if (station.isChargeQ) return MARKER_CQ
  if (station.isFast) return MARKER_FAST
  return MARKER_SLOW
}

// ── Map re-center helper component ────────────────────────────────────

function InvalidateSize() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100)
  }, [map])
  return null
}

function RecenterMap({ lat, lng, sheetOffsetPx }: { lat: number; lng: number; sheetOffsetPx: number }) {
  const map = useMap()
  useEffect(() => {
    const zoom = 14
    // Shift the view center south so the user's pin appears centred in the
    // visible area above the bottom sheet, not behind it.
    const userPx = map.project([lat, lng], zoom)
    const adjustedPx = userPx.add(L.point(0, sheetOffsetPx / 2))
    const adjustedCenter = map.unproject(adjustedPx, zoom)
    map.setView(adjustedCenter, zoom, { animate: true })
  }, [lat, lng, map, sheetOffsetPx])
  return null
}

// ── Filter types ──────────────────────────────────────────────────────

type FilterId = 'open' | 'fast' | 'cq'

const FILTERS: { id: FilterId | 'best'; label: string }[] = [
  { id: 'best', label: 'Best match' },
  { id: 'open', label: 'Open now' },
  { id: 'fast', label: 'Fast' },
  { id: 'cq',   label: 'ChargeQ only' },
]

// Open + Fast are combinable; CQ is exclusive.
function applyFilter(stations: StationPoi[], active: Set<FilterId>): StationPoi[] {
  if (active.has('cq')) return stations.filter((s) => s.isChargeQ)
  let result = stations
  if (active.has('open')) result = result.filter((s) => s.isOpen)
  if (active.has('fast')) result = result.filter((s) => s.isFast)
  return result
}

// ── Bottom sheet snap states ──────────────────────────────────────────

type SheetSnap = 'peek' | 'half' | 'full'

// ── Main page ─────────────────────────────────────────────────────────

export default function FinderPage() {
  const [userLoc, setUserLoc] = useState(SYDNEY_FALLBACK)
  const [centerLoc, setCenterLoc] = useState(SYDNEY_FALLBACK)
  const [locating, setLocating] = useState(true)
  const [recentering, setRecentering] = useState(false)
  const [recenterKey, setRecenterKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [activeFilters, setActiveFilters] = useState<Set<FilterId>>(new Set())
  const [snap, setSnap] = useState<SheetSnap>('half')
  const [showOcmInfo, setShowOcmInfo] = useState(false)
  const { stations, loading, error, fetchStations } = useOcmStations()

  // Bottom sheet drag
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const dragStartSnap = useRef<SheetSnap>('half')

  // Geolocate on mount
  useEffect(() => {
    let cancelled = false
    getUserLocation().then((loc) => {
      if (cancelled) return
      setUserLoc(loc)
      setCenterLoc(loc)
      setLocating(false)
      fetchStations(loc.lat, loc.lng, 15)
    })
    return () => { cancelled = true }
  }, [fetchStations])

  const filtered = applyFilter(stations, activeFilters)
  const selectedStation = stations.find((s) => s.pid === selectedId)

  const handleMarkerClick = useCallback((station: StationPoi) => {
    setSelectedId(station.pid)
    setSnap('half')
  }, [])

  const handleCardClick = useCallback((station: StationPoi) => {
    setSelectedId((prev) => prev === station.pid ? null : station.pid)
  }, [])

  const handleJoined = useCallback(() => {
    if (selectedId) setJoinedIds((ids) => new Set([...ids, selectedId]))
  }, [selectedId])

  function toggleFilter(id: FilterId | 'best') {
    if (id === 'best') { setActiveFilters(new Set()); return }
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (id === 'cq') {
        next.has('cq') ? next.delete('cq') : (next.clear(), next.add('cq'))
      } else {
        next.has(id) ? next.delete(id) : (next.delete('cq'), next.add(id))
      }
      return next
    })
  }

  async function handleRecenter() {
    setRecentering(true)
    const loc = await getUserLocation()
    setUserLoc(loc)
    setCenterLoc(loc)
    setRecenterKey((k) => k + 1)
    fetchStations(loc.lat, loc.lng)
    setRecentering(false)
  }

  // Drag handlers for bottom sheet
  function onSheetDragStart(e: React.TouchEvent | React.MouseEvent) {
    dragStartY.current = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    dragStartSnap.current = snap
  }

  function onSheetDragEnd(e: React.TouchEvent | React.MouseEvent) {
    const endY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY
    const delta = endY - dragStartY.current
    if (delta < -40) {
      setSnap(dragStartSnap.current === 'peek' ? 'half' : 'full')
    } else if (delta > 40) {
      setSnap(dragStartSnap.current === 'full' ? 'half' : 'peek')
    }
  }

  const sheetHeights: Record<SheetSnap, string> = {
    peek: '72px',
    half: '45vh',
    full: '80vh',
  }

  return (
    <div style={{ height: '100%', minHeight: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Map */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapContainer
          center={[centerLoc.lat, centerLoc.lng]}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <InvalidateSize />
          <RecenterMap
            key={recenterKey}
            lat={centerLoc.lat}
            lng={centerLoc.lng}
            sheetOffsetPx={snap === 'peek' ? 72 : snap === 'half' ? window.innerHeight * 0.45 : window.innerHeight * 0.80}
          />

          {/* User location */}
          {!locating && (
            <Marker position={[userLoc.lat, userLoc.lng]} icon={MARKER_USER}>
              <Popup>You are here</Popup>
            </Marker>
          )}

          {/* Station markers */}
          {filtered.map((station) => (
            <Marker
              key={station.pid}
              position={[station.lat, station.lng]}
              icon={markerFor(station)}
              eventHandlers={{ click: () => handleMarkerClick(station) }}
            >
              <Popup>
                <div style={{ fontFamily: '"DM Sans", sans-serif', minWidth: 160 }}>
                  <strong style={{ fontSize: 13 }}>{station.name}</strong>
                  <br />
                  <span style={{ fontSize: 11, color: '#666' }}>{formatDistance(station.distanceKm)}</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Recenter FAB */}
      <button
        onClick={handleRecenter}
        disabled={recentering}
        style={{
          position: 'absolute', right: 14, top: 14, zIndex: 500,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(9,21,16,0.85)', color: 'var(--cream)',
          border: `0.5px solid ${recentering ? 'var(--g)' : 'rgba(29,158,117,0.3)'}`,
          cursor: recentering ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
        title="Find my location"
      >
        {recentering
          ? <span className="cq-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'var(--g)' }} />
          : '⌖'
        }
      </button>

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 400,
          background: 'var(--bg2)',
          borderRadius: '18px 18px 0 0',
          border: '0.5px solid rgba(29,158,117,0.2)',
          borderBottom: 'none',
          height: sheetHeights[snap],
          transition: 'height 0.3s cubic-bezier(0.2, 0.8, 0.3, 1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Handle — drag target */}
        <div
          style={{
            flexShrink: 0,
            padding: snap === 'peek' ? '0' : '10px 16px 2px',
            cursor: 'pointer', touchAction: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            minHeight: snap === 'peek' ? '72px' : 'auto',
          }}
          onTouchStart={onSheetDragStart}
          onTouchEnd={onSheetDragEnd}
          onMouseDown={onSheetDragStart}
          onMouseUp={onSheetDragEnd}
          onClick={() => { if (snap === 'peek') setSnap('half') }}
        >
          {snap === 'peek' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
              <div style={{ width: 38, height: 4, background: 'rgba(240,239,232,0.25)', borderRadius: 2 }} />
              <div style={{ fontSize: 12, color: 'var(--mint)', fontFamily: '"DM Sans", sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                Nearby stations <span style={{ fontSize: 10 }}>↑</span>
              </div>
            </div>
          ) : (
            <>
              <div style={{ width: 38, height: 4, background: 'rgba(240,239,232,0.25)', borderRadius: 2 }} />
              <div
                onTouchEnd={(e) => { e.stopPropagation(); setSnap('peek') }}
                onClick={(e) => { e.stopPropagation(); setSnap('peek') }}
                style={{
                  position: 'absolute', right: 16,
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(240,239,232,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'rgba(240,239,232,0.6)', fontSize: 16,
                }}
                title="Collapse"
              >
                ↓
              </div>
            </>
          )}
        </div>

        {/* Sheet header */}
        <div style={{ flexShrink: 0, padding: '4px 16px 10px' }}>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontSize: 19, fontWeight: 800,
            color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: showOcmInfo ? 6 : 8,
          }}>
            Charging stations
            <span
              onClick={() => setShowOcmInfo((v) => !v)}
              style={{
                width: 16, height: 16, borderRadius: '50%',
                border: `1px solid ${showOcmInfo ? 'var(--g)' : 'rgba(240,239,232,0.4)'}`,
                color: showOcmInfo ? 'var(--g)' : 'rgba(240,239,232,0.6)',
                fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >i</span>
          </div>
          {showOcmInfo && (
            <div style={{
              fontSize: 12, color: 'var(--mint)', lineHeight: 1.55,
              background: 'var(--gc)', borderRadius: 'var(--rads)',
              padding: '7px 10px', marginBottom: 8,
              borderLeft: '2px solid var(--g)',
            }}>
              Live data from Open Charge Map. Tap a pin or card for details.
            </div>
          )}

          {/* Filter chips */}
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0 6px',
            scrollbarWidth: 'none',
          }}>
            {FILTERS.map((f) => {
              const isActive = f.id === 'best' ? activeFilters.size === 0 : activeFilters.has(f.id as FilterId)
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  style={{
                    flexShrink: 0,
                    padding: '7px 14px',
                    background: isActive ? 'var(--b)' : 'rgba(240,239,232,0.08)',
                    color: isActive ? '#fff' : 'rgba(240,239,232,0.7)',
                    border: `0.5px solid ${isActive ? 'var(--b)' : 'transparent'}`,
                    borderRadius: 18,
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s, color 0.15s',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Station list */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0 12px 16px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {/* Loading */}
          {(loading || locating) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 24, color: 'var(--mint)', fontSize: 13 }}>
              <div className="cq-spinner" />
              <span>{locating ? 'Locating you…' : 'Loading stations…'}</span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{
              background: 'var(--al)', border: '0.5px solid var(--ab)',
              borderRadius: 'var(--rads)', padding: '10px 12px',
              fontSize: 12, color: 'var(--amber-t)', marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          {/* Selected station detail */}
          {selectedStation && (
            <StationDetailPanel
              station={selectedStation}
              isJoined={joinedIds.has(selectedStation.pid)}
              onJoined={handleJoined}
              onClose={() => setSelectedId(null)}
            />
          )}

          {/* Station list */}
          {!loading && !locating && filtered.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: 'rgba(240,239,232,0.5)', fontSize: 13, lineHeight: 1.6 }}>
              No stations found for this filter.<br />Try a different filter or search area.
            </div>
          )}

          {filtered.map((station) => (
            <StationCard
              key={station.pid}
              station={station}
              isSelected={selectedId === station.pid}
              isJoined={joinedIds.has(station.pid)}
              onClick={() => handleCardClick(station)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
