import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// ── Cinematic dark EV — matches the reference: sleek fastback, teal DRLs, rain-glow ──

function GoldenCar({ flipped = false }: { flipped?: boolean }) {
  const id = flipped ? 'f' : 'n'
  return (
    <svg width="220" height="88" viewBox="0 0 680 260" xmlns="http://www.w3.org/2000/svg"
      style={{ transform: flipped ? 'scaleX(-1)' : undefined, display: 'block' }}>
      <defs>
        <linearGradient id={`skyG${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050e10"/><stop offset="100%" stopColor="#0c1e22"/>
        </linearGradient>
        <linearGradient id={`bodyG${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c3540"/><stop offset="55%" stopColor="#0f2028"/><stop offset="100%" stopColor="#081418"/>
        </linearGradient>
        <linearGradient id={`roofG${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#243d48"/><stop offset="100%" stopColor="#111f28"/>
        </linearGradient>
        <linearGradient id={`glG${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a3a45" stopOpacity="0.9"/><stop offset="100%" stopColor="#0a1e28" stopOpacity="0.7"/>
        </linearGradient>
        <linearGradient id={`hlG${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00e5cc"/><stop offset="100%" stopColor="#00b8a8"/>
        </linearGradient>
        <radialGradient id={`wlG${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#0a1820"/><stop offset="100%" stopColor="#001018"/>
        </radialGradient>
        <clipPath id={`cc${id}`}><rect x="0" y="0" width="680" height="260"/></clipPath>
      </defs>
      <g clipPath={`url(#cc${id})`}>
        <rect x="0" y="0" width="680" height="180" fill={`url(#skyG${id})`}/>
        <rect x="0" y="180" width="680" height="80" fill="#060d12"/>
        <line x1="0" y1="180" x2="680" y2="180" stroke="#1a3a48" strokeWidth="1" opacity="0.5"/>
        <g opacity="0.14" stroke="#a8d8e8" strokeWidth="0.5">
          {[42,90,138,186,240,290,338,386,435,484,532,580,628].map((x,i)=>(
            <line key={x} x1={x} y1={i%2===0?0:6} x2={x-12} y2={i%2===0?80:86}/>
          ))}
        </g>
        <path d="M 95 182 Q 340 188 595 182 L 595 200 Q 340 206 95 200 Z" fill="#0a1e28" opacity="0.2"/>
        <ellipse cx="182" cy="214" rx="32" ry="5" fill="#0d2535" opacity="0.45"/>
        <ellipse cx="500" cy="214" rx="32" ry="5" fill="#0d2535" opacity="0.45"/>
        <ellipse cx="115" cy="192" rx="25" ry="4" fill="#ff1a00" opacity="0.07"/>
        <path d="M 572 182 Q 640 184 680 186 L 680 200 Q 640 198 572 198 Z" fill="#00e5cc" opacity="0.05"/>
        <path d="M 100 170 L 100 155 Q 102 148 115 142 L 170 128 Q 220 118 280 112 Q 340 107 400 108 Q 460 108 510 113 L 565 122 Q 585 128 592 138 L 598 152 L 600 170 Z" fill={`url(#bodyG${id})`} stroke="#1e3a48" strokeWidth="0.8"/>
        <path d="M 165 128 Q 300 115 460 115 Q 530 116 565 122" fill="none" stroke="#2a5068" strokeWidth="1.2" opacity="0.6"/>
        <path d="M 108 152 Q 250 145 430 144 Q 520 144 588 148" fill="none" stroke="#1a3548" strokeWidth="0.7" opacity="0.4"/>
        <path d="M 185 128 Q 210 108 255 96 Q 300 86 360 84 Q 415 83 455 88 Q 490 93 510 105 L 530 118 L 510 113 Q 470 107 415 107 Q 355 107 295 112 Q 240 118 200 128 Z" fill={`url(#roofG${id})`} stroke="#243d4a" strokeWidth="0.6"/>
        <path d="M 255 96 Q 340 85 450 89" fill="none" stroke="#3a5f72" strokeWidth="1" opacity="0.4"/>
        <path d="M 295 112 Q 320 108 370 107 Q 415 107 445 110 L 510 113 L 490 108 Q 455 104 410 104 Q 355 104 315 110 Z" fill={`url(#glG${id})`} stroke="#1e4055" strokeWidth="0.6"/>
        <path d="M 295 112 Q 270 118 245 128 L 265 126 Q 290 116 315 110 Z" fill={`url(#glG${id})`} stroke="#1e4055" strokeWidth="0.4" opacity="0.6"/>
        <path d="M 295 112 L 260 128 L 265 126 L 315 110 Z" fill="#0f2430" stroke="#1e3a48" strokeWidth="0.4"/>
        <path d="M 450 110 L 460 128 L 455 128 L 445 110 Z" fill="#0a1e2a"/>
        <path d="M 510 113 Q 548 120 568 135 L 575 152 L 560 148 Q 548 138 532 130 L 510 118 Z" fill="#0e2230" stroke="#1a3545" strokeWidth="0.4"/>
        <path d="M 105 170 L 580 170 L 590 176 L 95 176 Z" fill="#060f14"/>
        <path d="M 590 138 Q 605 142 610 155 L 600 158 Q 596 148 588 144 Z" fill="#081420" stroke="#102030" strokeWidth="0.5"/>
        <path d="M 590 138 Q 598 136 608 139 Q 612 141 612 144" fill="none" stroke={`url(#hlG${id})`} strokeWidth="3" strokeLinecap="round" opacity="0.95"/>
        <path d="M 591 150 Q 600 149 608 151" fill="none" stroke="#00c8b8" strokeWidth="1.2" strokeLinecap="round" opacity="0.65"/>
        <ellipse cx="602" cy="145" rx="9" ry="6" fill="#051218" stroke="#005a50" strokeWidth="0.8"/>
        <ellipse cx="602" cy="145" rx="5" ry="3.5" fill="#00c8b8" opacity="0.85"/>
        <ellipse cx="598" cy="144" rx="20" ry="13" fill="#00e5cc" opacity="0.06"/>
        <path d="M 103 138 Q 106 135 110 137 Q 112 141 110 148 L 106 148 Q 108 142 106 138 Z" fill="#cc0000" opacity="0.9"/>
        <path d="M 105 139 Q 107 136 109 138 L 109 146 L 107 146 Z" fill="#ff3333" opacity="0.95"/>
        <ellipse cx="100" cy="143" rx="20" ry="10" fill="#ff1a00" opacity="0.09"/>
        <path d="M 585 165 L 608 162 Q 615 165 612 170 L 590 172 Z" fill="#060d12" stroke="#0e2028" strokeWidth="0.4"/>
        <path d="M 590 172 L 614 169 L 616 172 L 590 175 Z" fill="#040a0e"/>
        <path d="M 92 162 L 108 165 L 108 172 L 88 172 Q 85 168 92 162 Z" fill="#06100e"/>
        <path d="M 460 170 Q 460 135 500 132 Q 540 132 540 170 Z" fill="#060f14"/>
        <path d="M 142 170 Q 142 135 182 132 Q 222 132 222 170 Z" fill="#060f14"/>
        {[182, 500].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="176" r="38" fill="#040c10" stroke="#0a1e28" strokeWidth="1.2"/>
            <circle cx={cx} cy="176" r="32" fill={`url(#wlG${id})`} stroke="#0d2535" strokeWidth="0.7"/>
            <g stroke="#1a3545" strokeWidth="1.5" strokeLinecap="round">
              {[0,45,90,135,180,225,270,315].map(d=>(
                <line key={d}
                  x1={cx+Math.cos(d*Math.PI/180)*9} y1={176+Math.sin(d*Math.PI/180)*9}
                  x2={cx+Math.cos(d*Math.PI/180)*30} y2={176+Math.sin(d*Math.PI/180)*30}/>
              ))}
            </g>
            <circle cx={cx} cy="176" r="9" fill="#060f14" stroke="#0d1e28" strokeWidth="0.8"/>
            <circle cx={cx} cy="176" r="5" fill="#0e2030" stroke="#1a3545" strokeWidth="0.5"/>
            <circle cx={cx} cy="176" r="2.5" fill="#243d50"/>
          </g>
        ))}
      </g>
    </svg>
  )
}

// ── Single road strip — car drives 3 times, step cards appear immediately ──

function RoadAnimation({ onStepReveal }: { onStepReveal: (idx: number) => void }) {
  const [carPos, setCarPos] = useState(-15)   // percentage of container width
  const [fromRight, setFromRight] = useState(false)
  const [pass, setPass] = useState(0)
  const [running, setRunning] = useState(false)
  const animating = useRef(false)

  useEffect(() => {
    if (animating.current) return
    animating.current = true

    const dirs = [false, true, false]

    async function runAll() {
      for (let i = 0; i < 3; i++) {
        const dir = dirs[i]
        setFromRight(dir)
        setPass(i + 1)
        setRunning(true)
        const startX = dir ? 115 : -15
        const endX   = dir ? -15 : 115
        setCarPos(startX)

        await new Promise<void>((resolve) => {
          const duration = 4200
          const start = Date.now()
          let revealed = false

          function tick() {
            const elapsed = Date.now() - start
            const p = Math.min(elapsed / duration, 1)
            const eased = p < 0.5 ? 2*p*p : -1+(4-2*p)*p
            setCarPos(startX + (endX - startX) * eased)

            // Reveal step card when car is ~60% across
            if (!revealed && p >= 0.6) {
              revealed = true
              onStepReveal(i)
            }

            if (p < 1) requestAnimationFrame(tick)
            else { setRunning(false); resolve() }
          }
          requestAnimationFrame(tick)
        })

        if (i < 2) await new Promise(r => setTimeout(r, 400))
      }
      setPass(0)
    }
    runAll()
  }, []) // eslint-disable-line

  return (
    <div style={{
      position: 'relative', height: 86, overflow: 'hidden',
      background: 'linear-gradient(180deg, rgba(29,158,117,0.03) 0%, rgba(29,158,117,0.07) 50%, rgba(29,158,117,0.03) 100%)',
      borderTop: '1px solid rgba(29,158,117,0.14)',
      borderBottom: '1px solid rgba(29,158,117,0.14)',
    }}>
      {/* Road dashes */}
      {[6,20,34,48,62,76,90].map((pct) => (
        <div key={pct} style={{ position: 'absolute', left:`${pct}%`, top:'50%', width:'6%', height:2, marginTop:-1, background:'rgba(29,158,117,0.18)', borderRadius:1 }}/>
      ))}
      {/* Pass label */}
      {pass > 0 && (
        <div style={{ position:'absolute', top:6, right:10, fontSize:9, color:'rgba(29,158,117,0.5)', fontFamily:'"DM Sans",sans-serif', letterSpacing:'0.06em', textTransform:'uppercase' }}>
          Step {pass} of 3
        </div>
      )}
      {/* Speed lines — trail behind the car regardless of direction */}
      {running && [0,1,2,3].map((i) => {
        // Car is 220px wide in the 100%-wide container
        // Left→right: trail appears behind (to the left of) the car front
        // Right→left: trail appears behind (to the right of) the car rear, so further right than carPos
        const offset = fromRight
          ? `calc(${carPos}% + 225px + ${i * 16}px)`   // trail to the right when going right→left
          : `calc(${carPos}% - ${65 + i * 16}px)`       // trail to the left when going left→right
        return (
          <div key={i} style={{
            position: 'absolute',
            left: offset,
            top: `${32 + i * 6}%`,
            width: `${16 + i * 10}px`,
            height: 1.5,
            background: `rgba(212,160,0,${0.5 - i * 0.1})`,
            borderRadius: 1,
          }}/>
        )
      })}
      {/* Car */}
      <div style={{ position:'absolute', left:`${carPos}%`, top:'50%', transform:'translateY(-54%)', willChange:'left' }}>
        <GoldenCar flipped={fromRight}/>
      </div>
    </div>
  )
}

// ── Interest form ─────────────────────────────────────────────────────

const PROVIDERS = ['AmpCharge','ChargeFox','Evie Networks','Tesla Supercharger','BP Pulse','NRMA Charging','Jolt','Chargery','Other']

function InterestForm({ onClose, onSubmitted }: { onClose:()=>void; onSubmitted:()=>void }) {
  const [mobile, setMobile] = useState('')
  const [provider, setProvider] = useState('')
  const [location, setLocation] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})

  function validate() {
    const e: Record<string,string> = {}
    if (!mobile.trim()) e.mobile = 'Please enter your mobile'
    if (!provider) e.provider = 'Please select the provider'
    if (!location.trim()) e.location = 'Please enter the location'
    setErrors(e); return Object.keys(e).length === 0
  }

  async function submit() {
    if (!validate()) return
    setLoading(true)

    const { error } = await supabase.from('location_flags').insert({
      station_name: `${provider} — ${location.trim()}`,
      reason: 'Driver requested ChargeQ installation',
      notes: `Mobile: ${mobile.trim()}. Provider: ${provider}. Location: ${location.trim()}`,
      lat: null,
      lng: null,
      reported_by: null,
    })

    setLoading(false)

    if (error) {
      console.error('location_flags insert error:', error)
      setErrors({ location: `Could not submit: ${error.message}. Please try again.` })
      return
    }

    setDone(true)
    onSubmitted()
  }

  const inp: React.CSSProperties = {
    width:'100%', height:48, padding:'0 14px',
    background:'rgba(255,255,255,0.07)', border:'1px solid rgba(29,158,117,0.35)',
    borderRadius:12, color:'#fff', fontFamily:'"DM Sans",sans-serif', fontSize:15,
    outline:'none', WebkitAppearance:'none',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(10px)', zIndex:900, display:'flex', alignItems:'flex-end', justifyContent:'center', animation:'fadeIn 0.2s ease' }}
      onClick={onClose}>
      <div style={{ background:'var(--bg2)', border:'1px solid rgba(29,158,117,0.3)', borderTop:'2px solid var(--g)', borderRadius:'20px 20px 0 0', padding:'20px 20px max(28px,env(safe-area-inset-bottom,28px))', width:'100%', maxWidth:480, animation:'slideSheet 0.3s cubic-bezier(0.2,0.8,0.3,1)', maxHeight:'88vh', overflowY:'auto' }}
        onClick={(e)=>e.stopPropagation()}>
        <div style={{ width:36, height:4, background:'rgba(255,255,255,0.15)', borderRadius:2, margin:'0 auto 16px' }}/>
        {done ? (
          <div style={{ textAlign:'center', padding:'16px 0 8px' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>⚡</div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:'var(--cream)', marginBottom:8 }}>Request received!</div>
            <div style={{ fontSize:13, color:'var(--mint)', lineHeight:1.7, marginBottom:20 }}>
              We'll reach out to <strong style={{ color:'var(--cream)' }}>{provider}</strong> about bringing ChargeQ to <strong style={{ color:'var(--cream)' }}>{location}</strong> and update you via SMS.
            </div>
            <button onClick={onClose} style={{ width:'100%', height:50, background:'var(--g)', color:'#fff', border:'none', borderRadius:12, fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:800, cursor:'pointer' }}>Done ✓</button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:19, fontWeight:800, color:'var(--cream)', marginBottom:4 }}>⚡ Request ChargeQ here</div>
            <div style={{ fontSize:13, color:'var(--mint)', lineHeight:1.6, marginBottom:18 }}>Tell us where — we'll reach out to the charge provider on your behalf.</div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--teal)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Mobile number</label>
              <input type="tel" inputMode="numeric" placeholder="04XX XXX XXX" value={mobile}
                onChange={(e)=>{ setMobile(e.target.value); setErrors(p=>({...p,mobile:''})) }}
                style={{ ...inp, borderColor:errors.mobile?'var(--r)':undefined }}
                onFocus={(e)=>{ e.target.style.borderColor='var(--g)'; e.target.style.boxShadow='0 0 0 3px rgba(29,158,117,0.12)' }}
                onBlur={(e)=>{ e.target.style.borderColor=errors.mobile?'var(--r)':'rgba(29,158,117,0.35)'; e.target.style.boxShadow='' }}/>
              {errors.mobile && <div style={{ fontSize:11, color:'#F7C1C1', marginTop:4 }}>{errors.mobile}</div>}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--teal)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Charging provider</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                {PROVIDERS.map((p) => (
                  <button key={p} onClick={()=>{ setProvider(p); setErrors(e=>({...e,provider:''})) }}
                    style={{ height:38, border:`1.5px solid ${provider===p?'var(--g)':errors.provider?'rgba(226,75,74,0.4)':'rgba(29,158,117,0.25)'}`, borderRadius:10, background:provider===p?'var(--gl)':'rgba(255,255,255,0.04)', color:provider===p?'var(--teal)':'rgba(255,255,255,0.7)', fontSize:12, fontWeight:provider===p?600:400, cursor:'pointer', fontFamily:'"DM Sans",sans-serif', transition:'all 0.15s' }}>
                    {p}
                  </button>
                ))}
              </div>
              {errors.provider && <div style={{ fontSize:11, color:'#F7C1C1', marginTop:4 }}>{errors.provider}</div>}
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--teal)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Location</label>
              <input type="text" placeholder="e.g. Southbound Pheasants Nest, IKEA Tempe" value={location}
                onChange={(e)=>{ setLocation(e.target.value); setErrors(p=>({...p,location:''})) }}
                style={{ ...inp, borderColor:errors.location?'var(--r)':undefined }}
                onFocus={(e)=>{ e.target.style.borderColor='var(--g)'; e.target.style.boxShadow='0 0 0 3px rgba(29,158,117,0.12)' }}
                onBlur={(e)=>{ e.target.style.borderColor=errors.location?'var(--r)':'rgba(29,158,117,0.35)'; e.target.style.boxShadow='' }}/>
              {errors.location && <div style={{ fontSize:11, color:'#F7C1C1', marginTop:4 }}>{errors.location}</div>}
            </div>
            <button onClick={submit} disabled={loading}
              style={{ width:'100%', height:54, background:loading?'var(--gm)':'var(--g)', color:'#fff', border:'none', borderRadius:14, fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:800, cursor:loading?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, boxShadow:'0 4px 24px rgba(29,158,117,0.4)' }}>
              {loading?<><span className="cq-spinner" style={{ width:18,height:18,borderWidth:2,borderTopColor:'#fff' }}/> Submitting...</>:'⚡ Submit request'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main landing page ─────────────────────────────────────────────────

const STEPS = [
  { icon:'📱', title:'Scan & join', desc:'One QR scan puts you in a virtual queue instantly. No app needed.' },
  { icon:'☕', title:'Go explore', desc:'Walk away. Shop. We hold your spot while you live your life.' },
  { icon:'⚡', title:'SMS & plug in', desc:'We text you the moment your bay is free. Five minutes to get there.' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [stepVisible, setStepVisible] = useState([false, false, false])
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function handleStepReveal(idx: number) {
    setStepVisible(prev => { const n=[...prev]; n[idx]=true; return n })
  }

  const allDone = stepVisible.every(Boolean)

  return (
    <div style={{ position:'fixed', inset:0, overflowY:'auto', overflowX:'hidden', background:'#091510', WebkitOverflowScrolling:'touch' as const }}>
      <div style={{ minHeight:'100%' }}>

        {/* ── Hero ── */}
        <div style={{ position:'relative', minHeight:'52vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'url(/hero-bg.jpg)', backgroundSize:'cover', backgroundPosition:'center 35%' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.05) 30%, rgba(9,21,16,0.9) 80%, #091510 100%)' }}/>
          <div style={{ position:'relative', zIndex:2, padding:'16px 20px 0' }}>
            <button onClick={()=>navigate('/')} style={{ background:'rgba(9,21,16,0.6)', border:'0.5px solid rgba(29,158,117,0.3)', borderRadius:20, padding:'6px 14px', color:'var(--mint)', fontSize:12, cursor:'pointer', fontFamily:'"DM Sans",sans-serif', backdropFilter:'blur(8px)' }}>← App</button>
          </div>
          <div style={{ position:'relative', zIndex:2, flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'0 22px 28px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ width:30, height:30, background:'rgba(29,158,117,0.9)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13Z"/></svg>
              </div>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:800, color:'#fff' }}>ChargeQ</span>
            </div>
            <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(24px,6.5vw,34px)', fontWeight:800, color:'#fff', lineHeight:1.1, marginBottom:10, textShadow:'0 2px 20px rgba(0,0,0,0.5)' }}>
              No more charge anxiety.<br/><span style={{ color:'#9FE1CB' }}>Your bay. Your time.</span>
            </h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.72)', lineHeight:1.65, maxWidth:300 }}>
              ChargeQ holds your queue spot while you explore — and texts you the moment your charger is free.
            </p>
          </div>
        </div>

        {/* ── How it works header ── */}
        <div style={{ textAlign:'center', padding:'22px 20px 12px' }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:800, color:'var(--cream)', marginBottom:3 }}>Here's how it works</div>
          <div style={{ fontSize:11, color:'var(--mint)' }}>Watch the car — each pass reveals a step</div>
        </div>

        {/* ── Animated road ── */}
        <RoadAnimation onStepReveal={handleStepReveal} />

        {/* ── Step cards — side by side, light up as car passes ── */}
        <div style={{ display:'flex', gap:8, padding:'14px 12px 24px' }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{
              flex:1,
              background:'rgba(9,21,16,0.9)',
              backdropFilter:'blur(16px)',
              border:`1px solid ${stepVisible[i]?'rgba(29,158,117,0.45)':'rgba(29,158,117,0.1)'}`,
              borderRadius:14,
              padding:'12px 10px',
              opacity: stepVisible[i] ? 1 : 0.18,
              transform: stepVisible[i] ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(6px)',
              transition:'all 0.45s cubic-bezier(0.2,0.8,0.3,1)',
              boxShadow: stepVisible[i] ? '0 4px 20px rgba(0,0,0,0.45)' : 'none',
            }}>
              <div style={{
                width:34, height:34, borderRadius:'50%', marginBottom:8,
                background: stepVisible[i] ? 'linear-gradient(135deg,#1D9E75,#085041)' : 'rgba(29,158,117,0.12)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:16, transition:'background 0.4s',
                boxShadow: stepVisible[i] ? '0 0 12px rgba(29,158,117,0.4)' : 'none',
              }}>
                {step.icon}
              </div>
              <div style={{ fontSize:9, color:'var(--teal)', fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:3 }}>Step {i+1}</div>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, color: stepVisible[i]?'#fff':'rgba(255,255,255,0.25)', marginBottom:3, lineHeight:1.2, transition:'color 0.4s' }}>
                {step.title}
              </div>
              <div style={{ fontSize:10.5, color: stepVisible[i]?'rgba(255,255,255,0.62)':'rgba(255,255,255,0.15)', lineHeight:1.5, transition:'color 0.4s' }}>
                {step.desc}
              </div>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div style={{ padding:'4px 18px 40px', opacity:allDone?1:0, transform:allDone?'translateY(0)':'translateY(20px)', transition:'opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(29,158,117,0.14),rgba(29,158,117,0.04))', border:'1px solid rgba(29,158,117,0.35)', borderRadius:20, padding:'22px 18px 18px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(29,158,117,0.6),transparent)' }}/>
            <div style={{ fontSize:30, marginBottom:8 }}>⚡</div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800, color:'#fff', marginBottom:8, lineHeight:1.2 }}>
              Missing ChargeQ at your charging station?
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.65, marginBottom:20 }}>
              Tell us where you are — we'll contact the charge provider and make it happen.
            </div>
            <button
              onClick={()=>!submitted&&setShowForm(true)}
              style={{ width:'100%', height:54, background:submitted?'rgba(29,158,117,0.4)':'var(--g)', color:'#fff', border:'none', borderRadius:14, fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:800, cursor:submitted?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, boxShadow:submitted?'none':'0 4px 28px rgba(29,158,117,0.45)', transition:'all 0.4s' }}>
              {submitted
                ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Submitted — thank you!</>
                : <>YES! ChargeQ needed here</>
              }
            </button>
          </div>
          <div style={{ textAlign:'center', marginTop:22 }}>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>© 2026 ChargeQ · Patent application filed</div>
            <a href="https://chargeq.com.au" style={{ fontSize:10, color:'var(--g)', textDecoration:'none' }}>chargeq.com.au</a>
          </div>
        </div>

        {showForm && (
          <InterestForm
            onClose={()=>setShowForm(false)}
            onSubmitted={()=>{ setSubmitted(true); setShowForm(false) }}
          />
        )}
      </div>
    </div>
  )
}
