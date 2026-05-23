import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet'
import { Radio, User, AlertTriangle, MessageSquare, Navigation, LogOut, Menu, X, Bell } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import V2VPanel from '../components/V2VPanel.jsx'
import { supabase } from '../lib/supabase.js'
import { startTracking, stopTracking } from '../services/telemetry.js'
import { getSessionAndVehicle } from '../services/auth.js'
import { triggerSOS } from '../services/sos.js'

const STATUS_COLOR = {
  moving:  '#00ff9d',
  parked:  '#ffd700',
  stalled: '#ff9500',
  sos:     '#ff2d44',
  offline: '#444',
}

export default function Dashboard({ user, profile, vehicles, isDemo, onSignOut, onOpenProfile, onOpenInbox }) {
  const [selected, setSelected] = useState(null)
  const [sidebarOpen, setSidebar] = useState(false)
  const [sosVehicles, setSos] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [fleetVehicles, setFleetVehicles] = useState([])
  const [myVehicle, setMyVehicle] = useState(null)
  const [myVehicleId, setMyVehicleId] = useState(null)
  const [tracking, setTracking] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const normalizedVehicles = useMemo(
    () => fleetVehicles.map(v => ({
      ...v,
      plate: v.plate || v.plate_number || 'UNKNOWN',
      status: (v.status || v.vehicle_status || 'offline').toLowerCase(),
      lat: v.lat ?? v.latitude ?? null,
      lng: v.lng ?? v.longitude ?? null,
    })).filter(v => v.lat != null && v.lng != null),
    [fleetVehicles]
  )

  useEffect(() => {
    setSos(normalizedVehicles.filter(v => v.status === 'sos'))
  }, [normalizedVehicles])

  useEffect(() => {
    if (isDemo) {
      setFleetVehicles(vehicles)
      return
    }

    let alive = true
    let channel = null

    async function loadAllVehicles() {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, plate, status, vehicle_status, latitude, longitude, lat, lng, speed, make, model, year, zone')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (!error && data && alive) setFleetVehicles(data)
    }

    loadAllVehicles()

    channel = supabase
      .channel('da-mesh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        loadAllVehicles
      )
      .subscribe()

    return () => {
      alive = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [isDemo])

  useEffect(() => {
    if (isDemo) return
    let mounted = true

    getSessionAndVehicle().then(({ vehicle, vehicleId }) => {
      if (!mounted) return
      setMyVehicle(vehicle)
      setMyVehicleId(vehicleId)
      if (vehicleId) {
        startTracking(vehicleId)
        setTracking(true)
      }
    })

    return () => {
      mounted = false
      stopTracking()
      setTracking(false)
    }
  }, [isDemo])

  useEffect(() => {
    if (!user?.id) return;

    function fetchUnreadCount() {
      supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('is_read', false)
        .then(({ count }) => setUnreadCount(count || 0));
    }

    fetchUnreadCount();

    const ch = supabase.channel('dashboard_unread')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, fetchUnreadCount)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [user?.id])

  const initials = (profile?.full_name || user?.email || 'D')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Default center — Nairobi
  const center = [-1.2921, 36.8219]
  const meshLines = useMemo(() => {
    const lines = []
    const activeVehicles = normalizedVehicles.filter(v => v.status !== 'offline')
    for (let i = 0; i < activeVehicles.length; i += 1) {
      for (let j = i + 1; j < activeVehicles.length; j += 1) {
        const a = activeVehicles[i]
        const b = activeVehicles[j]
        const dist = Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2))
        if (dist < 0.04) {
          lines.push({
            id: `${a.id}-${b.id}`,
            positions: [[a.lat, a.lng], [b.lat, b.lng]],
          })
        }
      }
    }
    return lines
  }, [normalizedVehicles])

  async function handleBroadcastSOS() {
    if (isDemo) {
      setStatusMsg('SOS disabled in demo mode')
      return
    }
    if (!user?.id || !myVehicleId) {
      setStatusMsg('No assigned vehicle found for SOS')
      return
    }

    try {
      const position = await new Promise(resolve => {
        if (!navigator.geolocation) {
          resolve(null)
          return
        }
        navigator.geolocation.getCurrentPosition(
          pos => resolve(pos),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
        )
      })
      await triggerSOS(user.id, myVehicleId, position)
      setStatusMsg('SOS alert sent')
    } catch {
      setStatusMsg('SOS failed to send')
    }
  }

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
            {normalizedVehicles.length} VEHICLE{normalizedVehicles.length !== 1 ? 'S' : ''}
          </div>

          {!isDemo && (
            <div style={{ fontSize: 10, color: tracking ? '#00ff9d' : 'rgba(255,255,255,0.3)', fontFamily: "'Share Tech Mono', monospace" }}>
              {tracking ? `TRACKING ON${myVehicle?.plate_number ? ` · ${myVehicle.plate_number}` : ''}` : 'TRACKING OFF'}
            </div>
          )}

          {/* Inbox */}
          {onOpenInbox && (
            <button onClick={onOpenInbox} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Bell size={14} color="#00d4ff" />
            </button>
          )}

          {/* Avatar / profile */}
          <button onClick={onOpenProfile} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#00d4ff', cursor: 'pointer' }}>
            {initials}
          </button>

          {/* Inbox button */}
          <button onClick={onOpenInbox} style={{ position: 'relative', width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <MessageSquare size={14} color="#00d4ff" />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: '50%', background: '#ff2d44', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
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

              {meshLines.map(line => (
                <Polyline
                  key={line.id}
                  positions={line.positions}
                  pathOptions={{
                    color: '#00d4ff',
                    weight: 1,
                    opacity: 0.15,
                    dashArray: '4 6',
                  }}
                />
              ))}

              {normalizedVehicles.map(v => (
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
                    <strong>{v.plate || v.plate_number}</strong><br />
                    {v.make} {v.model}<br />
                    Status: {v.status}<br />
                    {v.speed ? `Speed: ${v.speed} km/h` : ''}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              {/* Show placeholder dot if no vehicles yet */}
              {normalizedVehicles.length === 0 && (
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
          {normalizedVehicles.length === 0 && (
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
                <button
                  onClick={handleBroadcastSOS}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(255,45,68,0.1)',
                    border: '1px solid rgba(255,45,68,0.3)',
                    color: '#ff2d44',
                    fontSize: 11,
                    fontFamily: "'Share Tech Mono', monospace",
                    letterSpacing: 1,
                    cursor: 'pointer',
                  }}
                >
                  🚨 BROADCAST SOS
                </button>
                {!!statusMsg && (
                  <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: "'Share Tech Mono', monospace" }}>
                    {statusMsg}
                  </div>
                )}
              </div>
            )}

            {/* All vehicles list */}
            <div style={{ padding: '12px 16px 8px', fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', fontFamily: "'Share Tech Mono', monospace" }}>
              VEHICLE MESH ({normalizedVehicles.length})
            </div>
            {normalizedVehicles.length === 0 ? (
              <div style={{ padding: '20px 16px', fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.7 }}>
                No vehicles registered.<br />
                <button onClick={onOpenProfile} style={{ marginTop: 8, background: 'none', border: 'none', color: '#00d4ff', fontSize: 11, textDecoration: 'underline', cursor: 'pointer' }}>
                  Add one in your profile →
                </button>
              </div>
            ) : (
              normalizedVehicles.map(v => (
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
