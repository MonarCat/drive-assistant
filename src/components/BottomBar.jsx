import React from 'react'

export default function BottomBar({ vehicles }) {
  const online = vehicles.filter(v => v.status !== 'offline').length
  const total = vehicles.length
  const sosCount = vehicles.filter(v => v.status === 'sos').length
  const avgHops = online > 0
    ? (vehicles.filter(v => v.status !== 'offline').reduce((sum, v) => sum + v.meshHops, 0) / online).toFixed(1)
    : '—'

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[1000] flex items-center justify-between px-4"
      style={{
        height: 28,
        background: 'linear-gradient(0deg, rgba(5,10,15,0.98) 0%, rgba(5,10,15,0.85) 100%)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* Left — mesh status */}
      <div className="flex items-center gap-4">
        <NetItem label="MESH NODES" value={`${online}/${total}`} color="var(--accent)" />
        <NetItem label="AVG HOPS" value={avgHops} color="var(--accent2)" />
        {sosCount > 0 && (
          <NetItem label="SOS ACTIVE" value={sosCount} color="var(--red)" pulse />
        )}
      </div>

      {/* Center — protocol */}
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          D.A MESH v2.1
        </span>
        <span style={{ width: 1, height: 10, background: 'var(--border2)', display: 'inline-block' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          802.11s
        </span>
      </div>

      {/* Right — sync indicator */}
      <div className="flex items-center gap-2">
        <span className="animate-pulse-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent2)', display: 'inline-block' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          NETWORK SYNC
        </span>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--accent2)' }}>
          OK
        </span>
      </div>
    </div>
  )
}

function NetItem({ label, value, color, pulse }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <span
        className={pulse ? 'animate-blink' : ''}
        style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 600, color }}
      >
        {value}
      </span>
    </div>
  )
}
