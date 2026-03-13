import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

export function useVehicles(userId) {
  const [vehicles, setVehicles]   = useState([])
  const [loading, setLoading]     = useState(true)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    // Initial load
    loadVehicles()

    // Realtime subscription — update vehicle positions as they come in
    channelRef.current = supabase
      .channel(`vehicles:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicles',
        filter: `owner_id=eq.${userId}`
      }, () => loadVehicles())
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [userId])

  async function loadVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!error && data) setVehicles(data)
    } catch {}
    setLoading(false)
  }

  return { vehicles, loading, refresh: loadVehicles }
}
