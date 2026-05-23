import { supabase } from '../lib/supabase.js'

export async function triggerSOS(userId, vehicleId, position) {
  const { error } = await supabase.from('sos_alerts').insert({
    vehicle_id: vehicleId,
    user_id: userId,
    latitude: position?.coords?.latitude ?? null,
    longitude: position?.coords?.longitude ?? null,
    message: 'EMERGENCY — DRIVER SOS ACTIVATED',
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[SOS] Insert failed:', error.message)
    throw error
  }
}
