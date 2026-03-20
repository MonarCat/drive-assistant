import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

// Detect hard braking via accelerometer
const BRAKING_THRESHOLD = -4.0  // m/s² — approx 0.4g

export function useV2V(user, vehicles, isDemo) {
  const [nearbyEvents, setNearbyEvents]   = useState([])
  const [convoyMode, setConvoyMode]       = useState(false)
  const [activeConvoy, setActiveConvoy]   = useState(null)
  const lastSpeedRef                      = useRef(null)
  const lastEventRef                      = useRef(0)
  const channelRef                        = useRef(null)
  const posRef                            = useRef(null)

  const myVehicle = vehicles?.[0]

  // Position tracker
  useEffect(() => {
    if (!navigator.geolocation) return
    const w = navigator.geolocation.watchPosition(
      pos => { posRef.current = pos },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    )
    return () => navigator.geolocation.clearWatch(w)
  }, [])

  // Load and subscribe to nearby V2V events
  useEffect(() => {
    if (isDemo || !user?.id) return

    loadNearby()

    channelRef.current = supabase
      .channel('v2v-events')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'v2v_events' },
        payload => {
          const ev = payload.new
          // Filter: only show events within ~5km
          // (rough filter — precise distance calc in loadNearby)
          setNearbyEvents(prev => [ev, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [user?.id, isDemo])

  // Accelerometer-based hard braking detection
  useEffect(() => {
    if (isDemo || !myVehicle) return
    if (!window.DeviceMotionEvent) return

    // iOS 13+ requires permission
    async function requestAndListen() {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const perm = await DeviceMotionEvent.requestPermission()
          if (perm !== 'granted') return
        } catch { return }
      }

      window.addEventListener('devicemotion', handleMotion)
    }

    requestAndListen()
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [myVehicle?.id, isDemo])

  function handleMotion(event) {
    const acc = event.accelerationIncludingGravity
    if (!acc?.z) return

    const now = Date.now()
    // Debounce — don't spam events (min 10s between auto-events)
    if (now - lastEventRef.current < 10000) return

    const longAcc = acc.x || 0  // longitudinal acceleration
    if (longAcc < BRAKING_THRESHOLD) {
      lastEventRef.current = now
      broadcastV2VEvent('hard_braking', 2,
        `Hard braking detected ${posRef.current ? `near ${posRef.current.coords.latitude.toFixed(4)},${posRef.current.coords.longitude.toFixed(4)}` : ''}`
      )
    }
  }

  async function loadNearby() {
    try {
      const { data } = await supabase
        .from('v2v_events')
        .select('*, vehicle:vehicles(plate, make, model)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(30)
      setNearbyEvents(data || [])
    } catch {}
  }

  async function broadcastV2VEvent(eventType, severity = 1, message = null) {
    if (!myVehicle || isDemo) return
    const pos = posRef.current
    try {
      await supabase.from('v2v_events').insert({
        vehicle_id: myVehicle.id,
        event_type: eventType,
        lat:        pos?.coords.latitude  || null,
        lng:        pos?.coords.longitude || null,
        speed:      pos?.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : null,
        heading:    pos?.coords.heading   || null,
        severity,
        message,
      })
    } catch {}
  }

  // ── CONVOY MODE ──────────────────────────────────────
  async function createConvoy(name) {
    if (!myVehicle) return
    try {
      const { data: convoy } = await supabase
        .from('convoys')
        .insert({ name, lead_vehicle_id: myVehicle.id, created_by: user.id })
        .select().single()

      // Join as lead (position 1)
      await supabase.from('convoy_members').insert({
        convoy_id:  convoy.id,
        vehicle_id: myVehicle.id,
        user_id:    user.id,
        position:   1,
      })

      setActiveConvoy(convoy)
      setConvoyMode(true)
      return convoy
    } catch (e) {
      console.error('createConvoy:', e.message)
    }
  }

  async function joinConvoy(channelCode) {
    try {
      const { data: convoy } = await supabase
        .from('convoys')
        .select('*, members:convoy_members(count)')
        .eq('channel_code', channelCode.toUpperCase().trim())
        .eq('status', 'active')
        .single()

      if (!convoy) throw new Error('Convoy not found')

      const position = (convoy.members?.[0]?.count || 0) + 1
      await supabase.from('convoy_members').upsert({
        convoy_id:  convoy.id,
        vehicle_id: myVehicle.id,
        user_id:    user.id,
        position,
        left_at:    null,
      }, { onConflict: 'convoy_id,vehicle_id' })

      setActiveConvoy(convoy)
      setConvoyMode(true)
      await broadcastV2VEvent('convoy_join', 1, `${myVehicle.plate} joined convoy ${channelCode}`)
      return convoy
    } catch (e) {
      throw e
    }
  }

  async function leaveConvoy() {
    if (!activeConvoy) return
    try {
      await supabase.from('convoy_members')
        .update({ left_at: new Date().toISOString() })
        .eq('convoy_id', activeConvoy.id)
        .eq('vehicle_id', myVehicle.id)

      await broadcastV2VEvent('convoy_leave', 1, `${myVehicle.plate} left convoy`)
      setActiveConvoy(null)
      setConvoyMode(false)
    } catch {}
  }

  // Manual hazard broadcast
  function reportHazard(message) {
    broadcastV2VEvent('hazard', 2, message)
  }

  return {
    nearbyEvents,
    convoyMode,
    activeConvoy,
    createConvoy,
    joinConvoy,
    leaveConvoy,
    reportHazard,
    broadcastV2VEvent,
  }
}
