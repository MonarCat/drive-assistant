import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { STATUS_COLORS } from '../data/mockVehicles'

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function VehicleLayer({ vehicles, selectedId, onSelect }) {
  const map = useMap()
  const markersRef = useRef({})
  const linesRef = useRef([])

  useEffect(() => {
    // Remove old mesh lines
    linesRef.current.forEach(l => l.remove())
    linesRef.current = []

    // Draw mesh lines between active vehicles
    const activeVehicles = vehicles.filter(v => v.status !== 'offline')
    for (let i = 0; i < activeVehicles.length; i++) {
      for (let j = i + 1; j < activeVehicles.length; j++) {
        const a = activeVehicles[i]
        const b = activeVehicles[j]
        const dist = Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2))
        if (dist < 0.04) {
          const line = L.polyline(
            [[a.lat, a.lng], [b.lat, b.lng]],
            {
              color: '#00d4ff',
              weight: 1,
              opacity: 0.15,
              dashArray: '4 6',
            }
          ).addTo(map)
          linesRef.current.push(line)
        }
      }
    }

    // Update / create vehicle markers
    vehicles.forEach(vehicle => {
      const color = STATUS_COLORS[vehicle.status]
      const isSos = vehicle.status === 'sos'
      const isSelected = vehicle.id === selectedId

      const size = isSelected ? 18 : 12
      const ripple = isSos
        ? `<span style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${color};animation:ripple 1.2s ease-out infinite;"></span>`
        : isSelected
          ? `<span style="position:absolute;inset:-6px;border-radius:50%;border:1.5px solid ${color};opacity:0.4;animation:ripple 2s ease-out infinite;"></span>`
          : ''

      const html = `
        <div class="da-vehicle-marker" style="position:relative;width:${size}px;height:${size}px;">
          ${ripple}
          <div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:${color};
            border:${isSelected ? '2px' : '1.5px'} solid ${color};
            box-shadow:0 0 ${isSelected ? 12 : 6}px ${color}88;
            ${isSos ? 'animation:sosPulse 1s ease-in-out infinite;' : ''}
          "></div>
        </div>
      `

      const icon = L.divIcon({
        html,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      if (markersRef.current[vehicle.id]) {
        markersRef.current[vehicle.id]
          .setLatLng([vehicle.lat, vehicle.lng])
          .setIcon(icon)
      } else {
        const marker = L.marker([vehicle.lat, vehicle.lng], { icon })
          .addTo(map)
          .on('click', () => onSelect(vehicle.id))
        markersRef.current[vehicle.id] = marker
      }
    })

    // Remove markers for vehicles no longer in list
    Object.keys(markersRef.current).forEach(id => {
      if (!vehicles.find(v => v.id === id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
      }
    })
  }, [vehicles, selectedId, map, onSelect])

  useEffect(() => {
    return () => {
      Object.values(markersRef.current).forEach(m => m.remove())
      linesRef.current.forEach(l => l.remove())
    }
  }, [])

  return null
}

export default function MapView({ vehicles, selectedId, onSelect }) {
  const center = [-1.2921, 36.8219]

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ width: '100%', height: '100%', background: '#050e18' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <VehicleLayer vehicles={vehicles} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  )
}
