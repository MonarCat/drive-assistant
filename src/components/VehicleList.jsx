import React from 'react'
import { STATUS_COLORS, STATUS_LABELS, SIGNAL_LABELS } from '../data/mockVehicles'

export default function VehicleList({ vehicles, selectedId, onSelect }) {
  return (
    <div
      className="absolute left-0 top-[52px] bottom-0 z-[900] flex flex-col animate-slide-left"
      style={{
        width: 240,
        background: 'var(--panel)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}
      >
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: 'var(--text-mid)', letterSpacing: '0.12em' }}>
          NETWORK NODES
        </span>
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: 'var(--text-mid)' }}>
          {vehicles.length}
        </span>
      </div>

      {/* Vehicle entries */}
      <div className="flex-1 overflow-y-auto">
        {vehicles.length === 0 ? (
          <div className="p-4 text-center" style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: 'var(--text-dim)' }}>
            NO RESULTS
          </div>
        ) : (
          vehicles.map(vehicle => (
            <VehicleRow
              key={vehicle.id}
              vehicle={vehicle}
              selected={vehicle.id === selectedId}
              onClick={() => onSelect(vehicle.id === selectedId ? null : vehicle.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}
      >
        <span className="animate-pulse-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent2)', display: 'inline-block' }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: 'var(--text-dim)' }}>
          MESH SYNC ACTIVE
        </span>
      </div>
    </div>
  )
}

function VehicleRow({ vehicle, selected, onClick }) {
  const color = STATUS_COLORS[vehicle.status]
  const isSos = vehicle.status === 'sos'
  const isOffline = vehicle.status === 'offline'

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 transition-colors"
      style={{
        background: selected ? 'var(--accent-dim)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        borderLeft: selected ? '2px solid var(--accent)' : '2px solid transparent',
        cursor: 'pointer',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        {/* Plate */}
        <span
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 11,
            color: isOffline ? 'var(--text-dim)' : 'var(--text)',
            letterSpacing: '0.05em',
          }}
        >
          {vehicle.plate}
        </span>

        {/* Status badge */}
        <span
          className={isSos ? 'animate-blink' : ''}
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 8,
            color,
            letterSpacing: '0.1em',
            padding: '1px 4px',
            border: `1px solid ${color}`,
            borderRadius: 2,
            background: isSos ? 'rgba(255,59,78,0.1)' : 'transparent',
          }}
        >
          {STATUS_LABELS[vehicle.status]}
        </span>
      </div>

      <div className="flex items-center justify-between">
        {/* Owner */}
        <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 10, color: 'var(--text-mid)' }}>
          {vehicle.owner}
        </span>

        {/* Speed / Signal */}
        <div className="flex items-center gap-2">
          {!isOffline && (
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: 'var(--text-dim)' }}>
              {vehicle.speed > 0 ? `${vehicle.speed}km/h` : 'STOPPED'}
            </span>
          )}
          <span style={{ fontSize: 9, color: vehicle.signal === 'strong' ? 'var(--accent2)' : vehicle.signal === 'medium' ? 'var(--yellow)' : 'var(--text-dim)', letterSpacing: '-1px' }}>
            {SIGNAL_LABELS[vehicle.signal]}
          </span>
        </div>
      </div>

      {/* Route */}
      <div className="mt-0.5">
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: 'var(--text-dim)' }}>
          {vehicle.route}
        </span>
      </div>
    </button>
  )
}
