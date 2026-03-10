import { useState, useEffect, useCallback } from 'react'
import { MOCK_VEHICLES, moveVehicle } from '../utils/vehicleData'

export function useVehicles() {
  const [vehicles, setVehicles] = useState(MOCK_VEHICLES)
  const [selectedId, setSelectedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Live movement engine
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles(prev => prev.map(moveVehicle))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleSelect = useCallback((id) => {
    setSelectedId(id === null ? null : (prev => (prev === id ? null : id)))
  }, [])

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = !searchQuery ||
      v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.route.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = statusFilter === 'all' || v.status === statusFilter
    return matchesSearch && matchesFilter
  })

  const selectedVehicle = vehicles.find(v => v.id === selectedId) || null

  const sosVehicles = vehicles.filter(v => v.status === 'sos')

  return {
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
  }
}
