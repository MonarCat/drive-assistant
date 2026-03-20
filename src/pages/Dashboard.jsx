import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { Radio, User, AlertTriangle, MessageSquare, Navigation, LogOut, Menu, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { useTelemetry } from '../hooks/useTelemetry.js'
import V2VPanel from '../components/V2VPanel.jsx'

const STATUS_COLOR = {
  moving:  '#00ff9d',
  parked:  '#ffd700',
  stalled: '#ff9500',
  sos:     '#ff2d44',
  offline: '#444',
}

export default function Dashboard({ user, profile, vehicles, isDemo, onSignOut, onOpenProfile }) {
  useTelemetry(user, vehicles, isDemo)
  const [selected, setSelected]   = useState(null)
  const [sidebarOpen, setSidebar] = useState(false)
  const [sosVehicles, setSos]     = useState([])

  useEffect(() => {
    setSos(vehicles.filter(v => v.status === 'sos'))
  }, [vehicles])

  const initials = (profile?.full_name || user?.email || 'D')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Default center — Nairobi
  const center = [-1.2921, 36.8219]

  return (
    <div style={{ height: '100vh', background: '#0a0e1a', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Exo 2', sans-serif" }}>

      {/* ── TOP BAR ─────────────────────────────────── */}
      <div style={{ height: 50, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, zIndex: 400 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Radio size={16} color="#00d4ff" />
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 4, color: '#00d4ff' }}>D.A</span>
          <span style={{ fontSize: 8, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', fontFamily: "'Share Tech Mono', monospace" }}>DRIVE ASSISTANT</span>
        </div>

        {/* SOS alert strip */}
        {sosVehicles.length > 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(255,45,68,0.1)', border: '1px solid rgba(255,45,68,0.3)', borderRadius: 4, animation: 'blink 1s infinite' }}>
            <AlertTriangle size={12} color="#ff2d44" />
            <span style={{ fontSize: 10, color: '#ff2d44', fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>
              SOS ACTIVE — {sosVehicles.map(v => v.plate).join(', ')}
            </span>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Vehicle count */}
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'Share Tech Mono', monospace" }}>
            {vehicles.length} VEHICLE{vehicles.length !== 1 ? 'S' : ''}
          </div>

          {/* Avatar / profile */}
          <button onClick={onOpenProfile} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#00d4ff', cursor: 'pointer' }}>
            {initials}
          </button>

          {/* Hamburger for vehicle sidebar on mobile */}
          <button onClick={() => setSidebar(!sidebarOpen)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '5px 7px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex' }}>
            {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ──────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* MAP */}
        <div style={{ flex: 1, position: 'relative' }}>
          {typeof window !== 'undefined' && (
            <MapContainer
              center={center}
              zoom={12}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap contributors &copy; CARTO'
              />

              {vehicles.map(v => (
                <CircleMarker
                  key={v.id}
                  center={[v.lat || v.latitude || -1.2921, v.lng || v.longitude || 36.8219]}
                  radius={selected?.id === v.id ? 10 : 7}
                  pathOptions={{
                    color: STATUS_COLOR[v.status] || '#444',
                    fillColor: STATUS_COLOR[v.status] || '#444',
                    fillOpacity: 0.9,
                    weight: selected?.id === v.id ? 2 : 1,
                  }}
                  eventHandlers={{ click: () => setSelected(v) }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 140 }}>
                      <strong>{v.plate}</strong><br />
                      {v.make} {v.model}<br />
                      Status: {v.status}<br />
                      {v.speed ? `Speed: ${v.speed} km/h` : ''}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              {/* Show placeholder dot if no vehicles yet */}
              {vehicles.length === 0 && (
                <CircleMarker
                  center={center}
                  radius={6}
                  pathOptions={{ color: '#00d4ff', fillColor: '#00d4ff', fillOpacity: 0.4, weight: 1 }}
                />
              )}
            </MapContainer>
          )}

          {/* V2V Panel */}
          <V2VPanel user={user} vehicles={vehicles} isDemo={isDemo} />

          {/* No vehicles message */}
          {vehicles.length === 0 && (
            <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', padding: '10px 18px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', zIndex: 500, whiteSpace: 'nowrap' }}>
              No vehicles yet —{' '}
              <button onClick={onOpenProfile} style={{ background: 'none', border: 'none', color: '#00d4ff', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}>
                register your vehicle
              </button>
            </div>
          )}
        </div>

        {/* VEHICLE SIDEBAR */}
        {(sidebarOpen || selected) && (
          <div style={{ width: 280, background: 'rgba(10,14,26,0.97)', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0, zIndex: 300 }}>

            {/* Selected vehicle detail */}
            {selected && (
              <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', fontFamily: "'Share Tech Mono', monospace" }}>SELECTED</div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><X size={13} /></button>
                </div>
                <VehicleCard vehicle={selected} expanded />
              </div>
            )}

            {/* All vehicles list */}
            <div style={{ padding: '12px 16px 8px', fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', fontFamily: "'Share Tech Mono', monospace" }}>
              MY VEHICLES ({vehicles.length})
            </div>
            {vehicles.length === 0 ? (
              <div style={{ padding: '20px 16px', fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.7 }}>
                No vehicles registered.<br />
                <button onClick={onOpenProfile} style={{ marginTop: 8, background: 'none', border: 'none', color: '#00d4ff', fontSize: 11, textDecoration: 'underline', cursor: 'pointer' }}>
                  Add one in your profile →
                </button>
              </div>
            ) : (
              vehicles.map(v => (
                <div key={v.id} onClick={() => setSelected(v)}
                  style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: selected?.id === v.id ? 'rgba(0,212,255,0.05)' : 'transparent', transition: 'background 0.15s' }}>
                  <VehicleCard vehicle={v} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── BOTTOM BAR ─────────────────────────────── */}
      <div style={{ height: 36, background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 20, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>
          👤 {profile?.full_name || user?.email}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>
          🔒 E2E ENCRYPTED
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>
          📡 MESH READY
        </span>
        <button onClick={onSignOut} style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,45,68,0.2)', borderRadius: 4, padding: '3px 10px', color: 'rgba(255,45,68,0.5)', fontSize: 9, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <LogOut size={10} /> SIGN OUT
        </button>
      </div>

      <style>{`
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        .leaflet-container { background: #0a0e1a !important; }
      `}</style>
    </div>
  )
}

const VERIFICATION_CONFIG = {
  verified:     { color: '#00ff9d', bg: 'rgba(0,255,157,0.08)', border: 'rgba(0,255,157,0.3)',  icon: '✔', label: 'VERIFIED'              },
  pending:      { color: '#ffd700', bg: 'rgba(255,215,0,0.08)',  border: 'rgba(255,215,0,0.3)',  icon: '⏳', label: 'PENDING VERIFICATION'  },
  under_review: { color: '#00d4ff', bg: 'rgba(0,212,255,0.08)',  border: 'rgba(0,212,255,0.3)', icon: '🔍', label: 'UNDER REVIEW'           },
  rejected:     { color: '#ff2d44', bg: 'rgba(255,45,68,0.08)',  border: 'rgba(255,45,68,0.3)', icon: '✖', label: 'VERIFICATION REJECTED'  },
}

function VehicleCard({ vehicle: v, expanded }) {
  const color = STATUS_COLOR[v.status] || '#444'
  const verStatus = (v.verification_status || 'pending').toLowerCase()
  const ver = VERIFICATION_CONFIG[verStatus] || VERIFICATION_CONFIG.pending
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, color: '#fff', fontFamily: "'Rajdhani', sans-serif" }}>{v.plate}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{[v.make, v.model, v.year].filter(Boolean).join(' ')}</div>
        </div>
        <div style={{ fontSize: 9, color, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>
          {(v.status || 'offline').toUpperCase()}
        </div>
      </div>
      {expanded && (
        <>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              ['Speed', v.speed ? `${v.speed} km/h` : '—'],
              ['Fuel',  v.fuel_level != null ? `${v.fuel_level}%` : '—'],
              ['Color', v.color || '—'],
            ].map(([label, val]) => (
              <div key={label} style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 3, fontFamily: "'Share Tech Mono', monospace" }}>{label}</div>
                <div style={{ fontSize: 12, color: '#fff' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Verification status banner */}
          <div style={{ marginTop: 10, padding: '10px 12px', background: ver.bg, border: `1px solid ${ver.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>{ver.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1, marginBottom: 2 }}>
                VEHICLE VERIFICATION
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: ver.color, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>
                {ver.label}
              </div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ver.color, boxShadow: `0 0 6px ${ver.color}` }} />
          </div>
        </>
      )}
    </div>
  )
}
