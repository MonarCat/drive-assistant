import React, { useState, useEffect } from 'react'

export default function TopBar({ vehicles, searchQuery, setSearchQuery, profile, onShowProfile }) {
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const active = vehicles.filter(v => v.status === 'active').length
  const sos = vehicles.filter(v => v.status === 'sos').length
  const offline = vehicles.filter(v => v.status === 'offline').length
  const meshNodes = vehicles.filter(v => v.status !== 'offline').length

  const timeStr = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div
      className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-2"
      style={{
        background: 'linear-gradient(180deg, rgba(5,10,15,0.98) 0%, rgba(5,10,15,0.85) 100%)',
        borderBottom: '1px solid var(--border)',
        height: '52px',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="10" stroke="#00d4ff" strokeWidth="1.5" fill="none"/>
            <circle cx="16" cy="16" r="3" fill="#00d4ff"/>
            <line x1="16" y1="6" x2="16" y2="10" stroke="#00d4ff" strokeWidth="1.5"/>
            <line x1="16" y1="22" x2="16" y2="26" stroke="#00d4ff" strokeWidth="1.5"/>
            <line x1="6" y1="16" x2="10" y2="16" stroke="#00d4ff" strokeWidth="1.5"/>
            <line x1="22" y1="16" x2="26" y2="16" stroke="#00d4ff" strokeWidth="1.5"/>
          </svg>
          <span
            className="font-bold tracking-widest text-glow-accent"
            style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', color: '#00d4ff' }}
          >
            D.A
          </span>
          <span
            className="text-xs tracking-widest"
            style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--text-mid)' }}
          >
            DRIVE ASSISTANT
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--border2)' }} />

        {/* Stats */}
        <div className="flex items-center gap-4">
          <Stat label="MESH" value={`${meshNodes}/${vehicles.length}`} color="var(--accent)" />
          <Stat label="ACTIVE" value={active} color="var(--accent)" />
          {sos > 0 && <Stat label="SOS" value={sos} color="var(--red)" pulse />}
          <Stat label="OFFLINE" value={offline} color="var(--text-dim)" />
        </div>
      </div>

      {/* Right — search + clock + live */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded"
          style={{ background: 'var(--panel)', border: '1px solid var(--border2)', width: 220 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search plate, owner..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs w-full"
            style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--text)', caretColor: 'var(--accent)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-mid)' }}>✕</button>
          )}
        </div>

        {/* Live clock */}
        <div className="flex flex-col items-end" style={{ lineHeight: 1.2 }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: 'var(--accent)', letterSpacing: '0.05em' }}>
            {timeStr}
          </span>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
            {dateStr}
          </span>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <span className="animate-pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)', display: 'inline-block' }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: 'var(--accent2)' }}>LIVE</span>
        </div>

        {/* Profile button */}
        {onShowProfile && (
          <button
            onClick={onShowProfile}
            title="Profile"
            style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 11, fontWeight: 700, color: '#00d4ff' }}>
              {(profile?.full_name || profile?.email || '?')[0]?.toUpperCase() || '?'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color, pulse }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: 'var(--text-mid)', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <span
        className={pulse ? 'animate-blink' : ''}
        style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 600, color }}
      >
        {value}
      </span>
    </div>
  )
}
