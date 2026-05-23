import { supabase } from '../lib/supabase.js'

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function getSessionAndVehicle() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, vehicle: null, profile: null, vehicleId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('clearance_level, role, badge_number, org_id, full_name')
    .eq('id', user.id)
    .single()

  const { data: assignment } = await supabase
    .from('vehicle_assignments')
    .select('vehicle_id, assignment_role, vehicles(id, plate_number, status, zone, latitude, longitude, speed)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return {
    user,
    profile: profile ?? null,
    vehicle: assignment?.vehicles ?? null,
    vehicleId: assignment?.vehicle_id ?? null,
  }
}
