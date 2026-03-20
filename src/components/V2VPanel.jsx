import React, { useState } from 'react'
import { AlertTriangle, Radio, Users, Mic, MicOff, Plus, LogIn, X } from 'lucide-react'
import { useV2V }  from '../hooks/useV2V.js'
import { usePTT }  from '../hooks/usePTT.js'

const EVENT_ICONS = {
  hard_braking:      '🛑',
  hazard:            '⚠️',
  accident:          '🚨',
  road_obstruction:  '🚧',
  convoy_join:       '🚗',
  convoy_leave:      '👋',
  speed_warning:     '⚡',
}

const EVENT_COLORS = {
  hard_braking:  '#ff2d44',
  accident:      '#ff2d44',
  hazard:        '#ff9500',
  road_obstruction: '#ffd700',
  convoy_join:   '#00ff9d',
  convoy_leave:  '#aaa',
  speed_warning: '#ffd700',
}

export default function V2VPanel({ user, vehicles, isDemo }) {
  const {
    nearbyEvents, convoyMode, activeConvoy,
    createConvoy, joinConvoy, leaveConvoy, reportHazard,
  } = useV2V(user, vehicles, isDemo)

  const { pttActive, pttStatus, peerCount, startPTT, stopPTT } = usePTT(user, activeConvoy, isDemo)

  const [view, setView]             = useState('events') // events|convoy
  const [convoyInput, setConvoyInput] = useState('')
  const [convoyName, setConvoyName]   = useState('')
  const [hazardMsg, setHazardMsg]     = useState('')
  const [expanded, setExpanded]       = useState(false)

  const criticalEvents = nearbyEvents.filter(e => ['hard_braking','accident'].includes(e.event_type))

  return (
    <div style={{
      position: 'absolute', bottom: 40, left: 16, zIndex: 900,
      width: expanded ? 320 : 'auto',
      background: 'rgba(10,14,26,0.95)',
      border: `1px solid ${criticalEvents.length > 0 ? 'rgba(255,45,68,0.4)' : 'rgba(0,212,255,0.15)'}`,
      borderRadius: 10,
      backdropFilter: 'blur(10px)',
      transition: 'all 0.2s',
      fontFamily: "'Exo 2',sans-serif",
    }}>

      {/* ── COLLAPSED BAR ─────────────────────────────── */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: expanded ? '10px 14px 8px' : '8px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>

        {/* Mesh indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#00d4ff', boxShadow:'0 0 6px #00d4ff', animation:'blink 2s infinite' }}/>
          <span style={{ fontSize:9, color:'#00d4ff', fontFamily:"'Share Tech Mono',monospace", letterSpacing:1 }}>
            D.A MESH
          </span>
        </div>

        {/* Critical event badge */}
        {criticalEvents.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', background:'rgba(255,45,68,0.12)', border:'1px solid rgba(255,45,68,0.3)', borderRadius:10, animation:'blink 0.8s infinite' }}>
            <AlertTriangle size={10} style={{ color:'#ff2d44' }}/>
            <span style={{ fontSize:9, color:'#ff2d44', fontFamily:"'Share Tech Mono',monospace" }}>
              {criticalEvents.length} ALERT{criticalEvents.length>1?'S':''}
            </span>
          </div>
        )}

        {/* Convoy badge */}
        {convoyMode && activeConvoy && (
          <div style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', background:'rgba(0,255,157,0.08)', border:'1px solid rgba(0,255,157,0.25)', borderRadius:10 }}>
            <Users size={10} style={{ color:'#00ff9d' }}/>
            <span style={{ fontSize:9, color:'#00ff9d', fontFamily:"'Share Tech Mono',monospace" }}>
              CONVOY
            </span>
          </div>
        )}

        {/* PTT badge */}
        {pttActive && (
          <div style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', background:'rgba(255,149,0,0.08)', border:'1px solid rgba(255,149,0,0.3)', borderRadius:10, animation:'blink 0.6s infinite' }}>
            <Mic size={10} style={{ color:'#ff9500' }}/>
            <span style={{ fontSize:9, color:'#ff9500', fontFamily:"'Share Tech Mono',monospace" }}>LIVE</span>
          </div>
        )}

        <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', marginLeft:'auto' }}>{expanded?'▼':'▶'}</span>
      </div>

      {/* ── EXPANDED PANEL ───────────────────────────── */}
      {expanded && (
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            {[
              { id:'events', label:'EVENTS',  icon:<AlertTriangle size={10}/> },
              { id:'convoy', label:'CONVOY',  icon:<Users size={10}/> },
            ].map(t => (
              <button key={t.id} onClick={() => setView(t.id)} style={{
                flex:1, padding:'7px', background: view===t.id ? 'rgba(0,212,255,0.06)' : 'transparent',
                border:'none', borderBottom: view===t.id ? '2px solid #00d4ff' : '2px solid transparent',
                color: view===t.id ? '#00d4ff' : 'rgba(255,255,255,0.3)',
                fontSize:8, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:5,
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* EVENTS VIEW */}
          {view === 'events' && (
            <div style={{ padding:12 }}>
              {/* Report hazard */}
              <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                <input
                  value={hazardMsg}
                  onChange={e => setHazardMsg(e.target.value)}
                  placeholder="Report hazard (pothole, accident...)"
                  style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:5, padding:'7px 10px', color:'#fff', fontSize:11, outline:'none' }}
                />
                <button
                  onClick={() => { if(hazardMsg.trim()){ reportHazard(hazardMsg); setHazardMsg('') } }}
                  style={{ padding:'7px 12px', background:'rgba(255,149,0,0.1)', border:'1px solid rgba(255,149,0,0.3)', borderRadius:5, color:'#ff9500', fontSize:11, cursor:'pointer' }}>
                  ⚠️
                </button>
              </div>

              {/* Events list */}
              {nearbyEvents.length === 0 ? (
                <div style={{ textAlign:'center', padding:'16px 0', fontSize:10, color:'rgba(255,255,255,0.15)' }}>No nearby events</div>
              ) : nearbyEvents.slice(0,6).map((ev, i) => (
                <div key={ev.id||i} style={{
                  display:'flex', alignItems:'flex-start', gap:8, padding:'7px 0',
                  borderBottom:'1px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>{EVENT_ICONS[ev.event_type] || '📍'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, color: EVENT_COLORS[ev.event_type] || '#aaa', fontWeight:600 }}>
                      {ev.event_type.replace(/_/g,' ').toUpperCase()}
                    </div>
                    {ev.message && <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ev.message}</div>}
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.2)', marginTop:2, fontFamily:"'Share Tech Mono',monospace" }}>
                      {ev.vehicle?.plate} · {new Date(ev.created_at).toLocaleTimeString('en-KE',{hour12:false})}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CONVOY VIEW */}
          {view === 'convoy' && (
            <div style={{ padding:12 }}>
              {convoyMode && activeConvoy ? (
                <div>
                  <div style={{ padding:'10px 12px', background:'rgba(0,255,157,0.06)', border:'1px solid rgba(0,255,157,0.15)', borderRadius:8, marginBottom:10 }}>
                    <div style={{ fontSize:11, color:'#00ff9d', fontWeight:600, marginBottom:3 }}>{activeConvoy.name || 'Active Convoy'}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Code: <strong style={{color:'#fff',letterSpacing:2}}>{activeConvoy.channel_code}</strong></div>
                  </div>

                  {/* PTT Button */}
                  <button
                    onPointerDown={startPTT}
                    onPointerUp={stopPTT}
                    onPointerLeave={stopPTT}
                    style={{
                      width:'100%', padding:'12px', borderRadius:8, cursor:'pointer',
                      background: pttActive ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${pttActive ? 'rgba(255,149,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: pttActive ? '#ff9500' : 'rgba(255,255,255,0.4)',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      fontSize:11, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1,
                      marginBottom:8, userSelect:'none',
                    }}>
                    {pttActive ? <Mic size={14}/> : <MicOff size={14}/>}
                    {pttActive ? 'TRANSMITTING — RELEASE TO STOP' : 'HOLD TO TALK'}
                  </button>

                  <button onClick={leaveConvoy} style={{ width:'100%', padding:'8px', borderRadius:6, cursor:'pointer', background:'transparent', border:'1px solid rgba(255,45,68,0.2)', color:'rgba(255,45,68,0.5)', fontSize:10, fontFamily:"'Share Tech Mono',monospace" }}>
                    Leave Convoy
                  </button>
                </div>
              ) : (
                <div>
                  {/* Create convoy */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:1, fontFamily:"'Share Tech Mono',monospace", marginBottom:5 }}>CREATE NEW</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <input value={convoyName} onChange={e => setConvoyName(e.target.value)} placeholder="Convoy name..." style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:5, padding:'7px 10px', color:'#fff', fontSize:11, outline:'none' }}/>
                      <button onClick={() => createConvoy(convoyName || 'My Convoy')} style={{ padding:'7px 12px', background:'rgba(0,255,157,0.1)', border:'1px solid rgba(0,255,157,0.3)', borderRadius:5, color:'#00ff9d', cursor:'pointer', display:'flex', alignItems:'center' }}>
                        <Plus size={13}/>
                      </button>
                    </div>
                  </div>

                  {/* Join convoy */}
                  <div>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:1, fontFamily:"'Share Tech Mono',monospace", marginBottom:5 }}>JOIN WITH CODE</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <input value={convoyInput} onChange={e => setConvoyInput(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:5, padding:'7px 10px', color:'#fff', fontSize:13, letterSpacing:3, outline:'none', fontWeight:700 }}/>
                      <button onClick={() => joinConvoy(convoyInput).catch(e => alert(e.message))} style={{ padding:'7px 12px', background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:5, color:'#00d4ff', cursor:'pointer', display:'flex', alignItems:'center' }}>
                        <LogIn size={13}/>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  )
}
