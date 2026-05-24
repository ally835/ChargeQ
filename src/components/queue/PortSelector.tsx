import { useState, useEffect } from 'react'
import type { PortSide } from '@/types'

interface PortSelectorProps {
  value: PortSide | '' | null
  onChange: (port: PortSide) => void
  hasError?: boolean
}

const PORTS: { id: PortSide; label: string }[] = [
  { id: 'fl', label: 'Front left' },
  { id: 'fr', label: 'Front right' },
  { id: 'fc', label: 'Front centre' },
  { id: 'rl', label: 'Rear left' },
  { id: 'rr', label: 'Rear right' },
  { id: 'dm', label: 'Driver side' },
  { id: 'pm', label: 'Passenger side' },
]

// Port positions on the car SVG (cx, cy)
const PORT_COORDS: Record<PortSide, { cx: number; cy: number }> = {
  fl: { cx: 102, cy: 78 },
  fr: { cx: 198, cy: 78 },
  fc: { cx: 150, cy: 52 },
  rl: { cx: 102, cy: 222 },
  rr: { cx: 198, cy: 222 },
  dm: { cx: 102, cy: 150 },
  pm: { cx: 198, cy: 150 },
}

export function PortSelector({ value, onChange, hasError }: PortSelectorProps) {
  // Use internal state so clicks are immediately reflected visually
  const [selected, setSelected] = useState<PortSide | null>((value as PortSide) || null)

  // Sync if parent value changes (e.g. when edit form opens for a different vehicle)
  useEffect(() => {
    setSelected((value as PortSide) || null)
  }, [value])

  function handleSelect(port: PortSide) {
    setSelected(port)
    onChange(port)
  }

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{
        position: 'relative',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(29,158,117,0.08) 0%, var(--bg3) 70%)',
        border: `1px solid ${hasError ? 'var(--r)' : 'rgba(29,158,117,0.2)'}`,
        borderRadius: 16,
        padding: '16px 8px',
        overflow: 'hidden',
      }}>

        {/* Grid lines background — pointer events none so clicks reach the car SVG */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1D9E75" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <svg
          viewBox="0 0 300 300"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto' }}
        >
          <defs>
            {/* Glow filter for selected port */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {/* Subtle glow for car body */}
            <filter id="bodyGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <radialGradient id="carGrad" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor="#1a3a28" />
              <stop offset="100%" stopColor="#0d2018" />
            </radialGradient>
            <radialGradient id="glassGrad" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="rgba(100,200,180,0.15)" />
              <stop offset="100%" stopColor="rgba(29,158,117,0.04)" />
            </radialGradient>
            {/* Selected port ring gradient */}
            <radialGradient id="portGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(29,158,117,0.4)" />
              <stop offset="100%" stopColor="rgba(29,158,117,0)" />
            </radialGradient>
          </defs>

          {/* ── Car body (top-down view) — pointer events disabled so dots are clickable ── */}

          {/* Shadow */}
          <ellipse cx="150" cy="158" rx="54" ry="90" fill="rgba(0,0,0,0.35)" style={{ pointerEvents: 'none' }} />

          {/* Main body */}
          <path
            d="
              M 150 48
              C 175 48 195 58 200 75
              L 208 105
              C 212 118 214 132 214 150
              C 214 168 212 182 208 195
              L 200 225
              C 195 242 175 252 150 252
              C 125 252 105 242 100 225
              L 92 195
              C 88 182 86 168 86 150
              C 86 132 88 118 92 105
              L 100 75
              C 105 58 125 48 150 48 Z
            "
            fill="url(#carGrad)"
            stroke="rgba(29,158,117,0.4)"
            strokeWidth="1"
            filter="url(#bodyGlow)"
            style={{ pointerEvents: 'none' }}
          />

          {/* Body highlight line left */}
          <path
            d="M 100 80 C 95 110 93 130 94 150 C 93 170 95 190 100 220"
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" style={{ pointerEvents: 'none' }}
          />
          {/* Body highlight line right */}
          <path
            d="M 200 80 C 205 110 207 130 206 150 C 207 170 205 190 200 220"
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeLinecap="round" style={{ pointerEvents: 'none' }}
          />

          {/* Windscreen */}
          <path
            d="M 120 78 C 128 68 172 68 180 78 L 188 108 C 176 102 124 102 112 108 Z"
            fill="url(#glassGrad)" stroke="rgba(29,158,117,0.25)" strokeWidth="0.8"
            style={{ pointerEvents: 'none' }}
          />

          {/* Rear window */}
          <path
            d="M 120 222 C 128 232 172 232 180 222 L 188 192 C 176 198 124 198 112 192 Z"
            fill="url(#glassGrad)" stroke="rgba(29,158,117,0.2)" strokeWidth="0.8"
            style={{ pointerEvents: 'none' }}
          />

          {/* Roof panel */}
          <path
            d="M 116 110 L 116 190 C 124 196 176 196 184 190 L 184 110 C 176 104 124 104 116 110 Z"
            fill="rgba(29,158,117,0.04)" stroke="rgba(29,158,117,0.15)" strokeWidth="0.5"
            style={{ pointerEvents: 'none' }}
          />

          {/* Center console hint */}
          <rect x="138" y="125" width="24" height="50" rx="4"
            fill="rgba(29,158,117,0.06)" stroke="rgba(29,158,117,0.12)" strokeWidth="0.5"
            style={{ pointerEvents: 'none' }}
          />

          {/* Front lights */}
          <path d="M 108 72 L 130 70 L 128 80 L 108 82 Z" fill="rgba(255,230,150,0.25)" stroke="rgba(255,220,100,0.3)" strokeWidth="0.5" style={{ pointerEvents: 'none' }}/>
          <path d="M 192 72 L 170 70 L 172 80 L 192 82 Z" fill="rgba(255,230,150,0.25)" stroke="rgba(255,220,100,0.3)" strokeWidth="0.5" style={{ pointerEvents: 'none' }}/>

          {/* Rear lights */}
          <path d="M 108 228 L 130 230 L 128 220 L 108 218 Z" fill="rgba(226,75,74,0.3)" stroke="rgba(226,75,74,0.4)" strokeWidth="0.5" style={{ pointerEvents: 'none' }}/>
          <path d="M 192 228 L 170 230 L 172 220 L 192 218 Z" fill="rgba(226,75,74,0.3)" stroke="rgba(226,75,74,0.4)" strokeWidth="0.5" style={{ pointerEvents: 'none' }}/>

          {/* ── Port selector dots — rendered last so they sit on top ── */}
          {PORTS.map((port) => {
            const { cx, cy } = PORT_COORDS[port.id]
            const isSelected = selected === port.id
            const isCentre = port.id === 'fc'
            const isLeft = !isCentre && cx < 150

            // Label position — centre port label goes above, others go left/right
            const lx = isCentre ? cx : isLeft ? cx - 22 : cx + 22
            const ly = isCentre ? cy - 16 : cy + 1
            const labelAnchor = isCentre ? 'middle' : isLeft ? 'end' : 'start'

            // Connector line — goes up for centre, sideways for others
            const lineX1 = isCentre ? cx : isLeft ? cx - 10 : cx + 10
            const lineY1 = isCentre ? cy - 10 : cy
            const lineX2 = isCentre ? cx : isLeft ? cx - 18 : cx + 18
            const lineY2 = isCentre ? cy - 14 : cy

            return (
              <g
                key={port.id}
                onClick={() => handleSelect(port.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Large invisible hit area — makes it easy to tap on mobile */}
                <circle cx={cx} cy={cy} r="20" fill="transparent" />

                {/* Glow halo when selected */}
                {isSelected && (
                  <circle
                    cx={cx} cy={cy} r="22"
                    fill="url(#portGlow)"
                  />
                )}

                {/* Connector line to label */}
                <line
                  x1={lineX1} y1={lineY1}
                  x2={lineX2} y2={lineY2}
                  stroke={isSelected ? '#1D9E75' : 'rgba(29,158,117,0.3)'}
                  strokeWidth="1"
                  strokeDasharray={isSelected ? 'none' : '2,2'}
                />

                {/* Outer ring */}
                <circle
                  cx={cx} cy={cy} r="10"
                  fill={isSelected ? 'rgba(29,158,117,0.2)' : 'rgba(9,21,16,0.8)'}
                  stroke={isSelected ? '#1D9E75' : 'rgba(29,158,117,0.35)'}
                  strokeWidth={isSelected ? '2' : '1.5'}
                  filter={isSelected ? 'url(#glow)' : undefined}
                />

                {/* Inner dot */}
                <circle
                  cx={cx} cy={cy} r={isSelected ? '5' : '3'}
                  fill={isSelected ? '#1D9E75' : 'rgba(29,158,117,0.5)'}
                />

                {/* Pulse ring animation for selected */}
                {isSelected && (
                  <circle
                    cx={cx} cy={cy} r="13"
                    fill="none"
                    stroke="#1D9E75"
                    strokeWidth="1"
                    opacity="0.5"
                  >
                    <animate attributeName="r" from="10" to="18" dur="1.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                )}

                {/* Label */}
                <text
                  x={lx}
                  y={ly}
                  textAnchor={labelAnchor}
                  dominantBaseline="middle"
                  fontSize="8"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight={isSelected ? '600' : '400'}
                  fill={isSelected ? '#9FE1CB' : 'rgba(159,225,203,0.5)'}
                >
                  {port.label}
                </text>
              </g>
            )
          })}

          {/* Center label */}
          <text x="150" y="155" textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fontFamily="DM Sans, sans-serif" fill="rgba(29,158,117,0.3)" letterSpacing="1"
          >
            TOP VIEW
          </text>

          {/* North indicator */}
          <text x="150" y="32" textAnchor="middle" fontSize="8" fontFamily="DM Sans, sans-serif"
            fill="rgba(255,255,255,0.2)" letterSpacing="1"
          >
            FRONT
          </text>
          <text x="150" y="270" textAnchor="middle" fontSize="8" fontFamily="DM Sans, sans-serif"
            fill="rgba(255,255,255,0.2)" letterSpacing="1"
          >
            REAR
          </text>
        </svg>

        {/* Selection prompt */}
        <div style={{
          textAlign: 'center', fontSize: 12,
          color: selected ? 'var(--teal)' : hasError ? '#F7C1C1' : 'var(--text3)',
          marginTop: 4, fontFamily: '"DM Sans", sans-serif',
          transition: 'color 0.2s',
        }}>
          {selected
            ? `✓ ${PORTS.find((p) => p.id === selected)?.label} selected`
            : hasError
            ? 'Please select the port location on your car'
            : 'Tap the port location on your car'
          }
        </div>
      </div>
    </div>
  )
}
