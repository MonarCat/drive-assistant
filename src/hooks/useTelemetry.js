import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
 
export function useTelemetry(user, vehicles, isDemo) {
  const intervalRef = useRef(null)
  const watchRef    = useRef(null)
  const posRef      = useRef(null)
 
  useEffect(() => {
    if (isDemo || !user?.id || user.id === 'demo') return
    const verified = vehicles?.filter(v => v.verification_status === 'verified') || []
    if (!verified.length || !navigator.geolocation) return
 
    watchRef.current = navigator.geolocation.watchPosition(
      pos => { posRef.current = pos },
      err => console.warn('GPS:', err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )
 
    intervalRef.current = setInterval(async () => {
      if (!posRef.current) return
      const { latitude: lat, longitude: lng, speed, heading } = posRef.current.coords
      for (const v of verified) {
        await supabase.from('vehicles').update({
          lat, lng,
          speed: speed != null ? Math.round(speed * 3.6) : 0,
          heading: heading || 0,
          vehicle_status: speed && speed > 1 ? 'moving' : 'parked',
          last_seen: new Date().toISOString(),
        }).eq('id', v.id).eq('owner_id', user.id)
      }
    }, 5000)
 
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user?.id, vehicles?.length, isDemo])
}
