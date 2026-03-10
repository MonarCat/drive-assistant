import React, { useState, useEffect } from 'react'

export default function SOSAlertBanner({ sosVehicles }) {
  const [dismissed, setDismissed] = useState([])
  const [visible, setVisible] = useState([])

  useEffect(() => {
    const active = sosVehicles.filter(v => !dismissed.includes(v.id))
    setVisible(active)
  }, [sosVehicles, dismissed])

  if (visible.length === 0) return null

  return (
    <div
      className="absolute top-[52px] left-[240px] right-0 z-[950] flex flex-col gap-1 p-2 pointer-events-none"
    >
      {visible.map(vehicle => (
        <div
          key={vehicle.id}
          className="animate-slide-down flex items-center justify-between px-3 py-2 pointer-events-auto"
          style={{
            background: 'rgba(255,59,78,0.12)',
            border: '1px solid var(--red)',
            borderRadius: 3,
            maxWidth: 480,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="animate-blink"
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                color: 'var(--red)',
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}
            >
              ⚡ SOS
            </span>
            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.05em' }}>
              {vehicle.plate}
            </span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: 'var(--text-mid)' }}>
              {vehicle.owner}
            </span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--text-dim)' }}>
              {vehicle.route}
            </span>
          </div>
          <button
            onClick={() => setDismissed(prev => [...prev, vehicle.id])}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: 12,
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
