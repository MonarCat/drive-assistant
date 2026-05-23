import { supabase } from '../lib/supabase.js'

let watchId = null
let sessionId = null
let vehicleId = null
let isTracking = false
let lastSentAt = 0
const MS_TO_KMH = 3.6
const TELEMETRY_INTERVAL_MS = 10000

function toKmh(speedMs) {
  return speedMs != null ? Math.round(speedMs * MS_TO_KMH * 100) / 100 : null
}

function generateSessionId() {
  return crypto.randomUUID()
}

export async function startTracking(vehId) {
  if (isTracking) return
  if (!navigator.geolocation) {
    console.warn('[Telemetry] Geolocation not supported')
    return
  }

  vehicleId = vehId
  sessionId = generateSessionId()
  isTracking = true
  lastSentAt = 0

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    isTracking = false
    return
  }

  const { data: assignment } = await supabase
    .from('vehicle_assignments')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!assignment) {
    console.warn('[Telemetry] No active assignment for this vehicle')
    isTracking = false
    return
  }

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const now = Date.now()
      if (now - lastSentAt < TELEMETRY_INTERVAL_MS) return
      lastSentAt = now

      const { latitude, longitude, speed, heading, accuracy, altitude } = position.coords
      const { error } = await supabase.from('vehicle_telemetry').insert({
        vehicle_id: vehicleId,
        latitude,
        longitude,
        speed: toKmh(speed),
        heading: heading ?? null,
        accuracy: accuracy ?? null,
        altitude: altitude ?? null,
        session_id: sessionId,
        recorded_at: new Date().toISOString(),
      })

      if (error) console.error('[Telemetry] Insert error:', error.message)
    },
    (err) => console.error('[Telemetry] Geolocation error:', err.message),
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    }
  )

  console.log('[Telemetry] Tracking started. Session:', sessionId)
}

export function stopTracking() {
  if (!isTracking) return
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
  isTracking = false
  sessionId = null
  lastSentAt = 0
  console.log('[Telemetry] Tracking stopped.')
}

export function isCurrentlyTracking() {
  return isTracking
}
