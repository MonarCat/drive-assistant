import React, { useState, useEffect, useCallback } from 'react'
import TopBar from './components/TopBar.jsx'
import VehicleList from './components/VehicleList.jsx'
import VehicleDetail from './components/VehicleDetail.jsx'
import MapView from './components/MapView.jsx'
import { MOCK_VEHICLES } from './data/mockVehicles.js'

// Simulate vehicle movement
function moveVehicle(v) {
  if (v.status === 'offline' || v.status === 'idle' || v.status === 'sos') return v
  const rad = (v.heading * Math.PI) / 180
  const delta = 0.0002 + Math.random() * 0.0001
  return {
    ...v,
    lat: v.lat + Math.cos(rad) * delta,
    lng: v.lng + Math.sin(rad) * delta,
    speed: Math.max(20, Math.min(80, v.speed + (Math.random() - 0.5) * 5)),
    lastSeen: '0s ago',
  }
}

export default function App() {
  const [vehicles, setVehicles] = useState(MOCK_VEHICLES)
  const [selectedId, setSelectedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Simulate live movement
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles(prev => prev.map(moveVehicle))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Filter by search
  const filteredVehicles = vehicles.filter(v => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      v.plate.toLowerCase().includes(q) ||
      v.owner.toLowerCase().includes(q) ||
      v.status.toLowerCase().includes(q) ||
      v.route.toLowerCase().includes(q)
    )
  })

  const selectedVehicle = vehicles.find(v => v.id === selectedId) || null

  const handleSelect = useCallback((id) => {
    setSelectedId(id)
  }, [])

  return (
    <div className="relative w-full h-full scanlines">
      {/* Grid background overlay */}
      <div className="absolute inset-0 grid-bg pointer-events-none z-[1]" />

      {/* Map fills full screen */}
      <div className="absolute inset-0 z-0">
        <MapView
          vehicles={vehicles}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>

      {/* Top bar */}
      <TopBar
        vehicles={vehicles}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedId={selectedId}
      />

      {/* Left sidebar — vehicle list */}
      <VehicleList
        vehicles={filteredVehicles}
        selectedId={selectedId}
        onSelect={handleSelect}
      />

      {/* Right panel — vehicle detail */}
      {selectedVehicle && (
        <VehicleDetail
          vehicle={selectedVehicle}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
