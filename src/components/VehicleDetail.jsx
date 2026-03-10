import React, { useState } from 'react'
import { STATUS_COLORS, STATUS_LABELS, SIGNAL_LABELS } from '../data/mockVehicles'

export default function VehicleDetail({ vehicle, onClose, onSos, onPoke, onTalk }) {
  const [activeAction, setActiveAction] = useState(null)

  if (!vehicle) return null

  const color = STATUS_COLORS[vehicle.status]
  const isSos = vehicle.status === 'sos'

  function handleAction(action) {
    setActiveAction(action)
    if (action === 'sos') onSos && onSos(vehicle)
    if (action === 'poke') onPoke && onPoke(vehicle)
    if (action === 'talk') onTalk && onTalk(vehicle)
    setTimeout(() => setActiveAction(null), 2000)
  }

  return (
    <div
      className="absolute right-0 top-[52px] bottom-0 z-[900] flex flex-col animate-slide-right"
      style={{
        width: 260,
        background: 'var(--panel)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}
      >
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: 'var(--text-mid)', letterSpacing: '0.12em' }}>
          NODE DETAIL
        </span>
        <button
          onClick={onClose}
          style={{ color: 'var(--text-dim)', fontSize: 16, lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none' }}
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Plate & status */}
        <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <span
              className={isSos ? 'animate-sos' : ''}
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '0.08em',
              }}
            >
              {vehicle.plate}
            </span>
            <span
              className={isSos ? 'animate-blink' : ''}
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color,
                padding: '2px 6px',
                border: `1px solid ${color}`,
                borderRadius: 2,
                background: `${color}18`,
              }}
            >
              {STATUS_LABELS[vehicle.status]}
            </span>
          </div>
          <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 13, color: 'var(--text-mid)' }}>
            {vehicle.owner}
          </div>
        </div>

        {/* Telemetry */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <SectionLabel>TELEMETRY</SectionLabel>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <TelemetryItem label="SPEED" value={`${vehicle.speed} km/h`} />
            <TelemetryItem
              label="FUEL"
              value={`${vehicle.fuel}%`}
              color={vehicle.fuel < 20 ? 'var(--red)' : vehicle.fuel < 40 ? 'var(--yellow)' : 'var(--accent2)'}
            />
            <TelemetryItem label="HEADING" value={`${vehicle.heading}°`} />
            <TelemetryItem label="MESH HOPS" value={vehicle.meshHops} />
          </div>
        </div>

        {/* Fuel bar */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex justify-between mb-1">
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: 'var(--text-dim)' }}>FUEL LEVEL</span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: vehicle.fuel < 20 ? 'var(--red)' : 'var(--accent2)' }}>
              {vehicle.fuel}%
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--border2)', borderRadius: 2 }}>
            <div
              style={{
                height: '100%',
                width: `${vehicle.fuel}%`,
                background: vehicle.fuel < 20 ? 'var(--red)' : vehicle.fuel < 40 ? 'var(--yellow)' : 'var(--accent2)',
                borderRadius: 2,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>

        {/* Route */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <SectionLabel>ROUTE</SectionLabel>
          <div className="mt-1" style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: 'var(--text)' }}>
            {vehicle.route}
          </div>
        </div>

        {/* Signal & Coords */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <SectionLabel>SIGNAL</SectionLabel>
          <div className="flex items-center gap-2 mt-1">
            <span style={{ fontSize: 12, color: vehicle.signal === 'strong' ? 'var(--accent2)' : vehicle.signal === 'medium' ? 'var(--yellow)' : 'var(--text-dim)', letterSpacing: '-1px' }}>
              {SIGNAL_LABELS[vehicle.signal]}
            </span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: 'var(--text-mid)', textTransform: 'uppercase' }}>
              {vehicle.signal}
            </span>
            <span style={{ marginLeft: 'auto', fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--text-dim)' }}>
              {vehicle.lastSeen}
            </span>
          </div>
          <div className="mt-1" style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--text-dim)' }}>
            {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
          </div>
        </div>

        {/* Actions */}
        <div className="px-3 py-3">
          <SectionLabel>ACTIONS</SectionLabel>
          <div className="flex flex-col gap-2 mt-2">
            <ActionButton
              label="📡  TALK DIRECT"
              active={activeAction === 'talk'}
              color="var(--accent)"
              onClick={() => handleAction('talk')}
              activeLabel="CONNECTING..."
            />
            <ActionButton
              label="👋  POKE"
              active={activeAction === 'poke'}
              color="var(--accent2)"
              onClick={() => handleAction('poke')}
              activeLabel="POKE SENT ✓"
            />
            <ActionButton
              label="🚨  BROADCAST SOS"
              active={activeAction === 'sos'}
              color="var(--red)"
              onClick={() => handleAction('sos')}
              activeLabel="SOS BROADCAST ✓"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
      {children}
    </span>
  )
}

function TelemetryItem({ label, value, color }) {
  return (
    <div className="flex flex-col">
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 600, color: color || 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

function ActionButton({ label, active, color, onClick, activeLabel }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2 px-3 text-left transition-all"
      style={{
        background: active ? `${color}22` : 'var(--panel2)',
        border: `1px solid ${active ? color : 'var(--border2)'}`,
        borderRadius: 3,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 10,
        color: active ? color : 'var(--text-mid)',
        cursor: 'pointer',
        letterSpacing: '0.05em',
      }}
    >
      {active ? activeLabel : label}
    </button>
  )
}
