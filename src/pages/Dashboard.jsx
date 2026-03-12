import React, { useCallback } from 'react'
import TopBar from '../components/TopBar'
import VehicleSidebar from '../components/VehicleSidebar'
import LiveMap from '../components/LiveMap'
import VehicleDetailPanel from '../components/VehicleDetailPanel'
import SOSAlertBanner from '../components/SOSAlertBanner'
import BottomBar from '../components/BottomBar'
import { useVehicles } from '../hooks/useVehicles'

export default function Dashboard({ profile, onShowProfile }) {
  const {
    vehicles,
    filteredVehicles,
    selectedId,
    selectedVehicle,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    handleSelect,
    sosVehicles,
  } = useVehicles()

  const handleTalk = useCallback((vehicle) => {
    console.info('[D.A] Talk direct:', vehicle.plate)
  }, [])

  const handlePoke = useCallback((vehicle) => {
    console.info('[D.A] Poke sent:', vehicle.plate)
  }, [])

  const handleTrack = useCallback((vehicle) => {
    console.info('[D.A] Tracking:', vehicle.plate)
  }, [])

  const handleSos = useCallback((vehicle) => {
    console.info('[D.A] SOS broadcast:', vehicle.plate)
  }, [])

  return (
    <div className="relative w-full h-full scanlines">
      {/* Grid background overlay */}
      <div className="absolute inset-0 grid-bg pointer-events-none z-[1]" />

      {/* Map fills full screen */}
      <div className="absolute inset-0 z-0">
        <LiveMap
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
        profile={profile}
        onShowProfile={onShowProfile}
      />

      {/* SOS alert banners */}
      <SOSAlertBanner sosVehicles={sosVehicles} />

      {/* Left sidebar — vehicle list */}
      <VehicleSidebar
        vehicles={filteredVehicles}
        selectedId={selectedId}
        onSelect={handleSelect}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* Right panel — vehicle detail */}
      {selectedVehicle && (
        <VehicleDetailPanel
          vehicle={selectedVehicle}
          onClose={() => handleSelect(null)}
          onTalk={handleTalk}
          onPoke={handlePoke}
          onTrack={handleTrack}
          onSos={handleSos}
        />
      )}

      {/* Bottom bar */}
      <BottomBar vehicles={vehicles} />
    </div>
  )
}
