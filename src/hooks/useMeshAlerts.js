import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
 
export function useMeshAlerts(isDemo) {
  const [alerts, setAlerts] = useState([])
  const channelRef = useRef(null)
 
  useEffect(() => {
    if (isDemo) return
    supabase.from('mesh_alerts').select('*')
      .gt('expires_at', new Date().toISOString())
      .order('sent_at', { ascending: false })
      .then(({ data }) => setAlerts(data || []))
 
    channelRef.current = supabase.channel('mesh-alerts-driver')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'mesh_alerts' },
        payload => setAlerts(prev => [payload.new, ...prev]))
      .subscribe()
 
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [isDemo])
 
  return { alerts, dismissAlert: (id) => setAlerts(prev => prev.filter(a => a.id !== id)) }
}
