import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useClientAuth() {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) await hydrate(s.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      if (event === 'SIGNED_OUT') { setUser(null); setProfile(null); setVehicles([]) }
      if (event === 'SIGNED_IN' && s?.user) await hydrate(s.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function hydrate(u) {
    try {
      // Get profile
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      if (p) {
        setUser(u)
        setProfile(p)
      } else {
        // Auto-create profile
        const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Driver'
        const { data: newP } = await supabase
          .from('profiles')
          .insert({
            id: u.id,
            full_name: name,
            phone: u.user_metadata?.phone || null,
            role: 'driver',
            is_active: true,
            clearance_level: 1,
            avatar_initials: name[0].toUpperCase(),
          })
          .select()
          .single()
        setUser(u)
        setProfile(newP || { id: u.id, full_name: name, role: 'driver' })
      }

      // Load their vehicles
      const { data: owned } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', u.id)

      setVehicles(owned || [])

    } catch (e) {
      console.warn('Client hydration error:', e.message)
      setUser(u)
      setProfile({ id: u.id, full_name: u.email, role: 'driver' })
    }

    setLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp({ email, password, full_name, phone }) {
    if (!full_name) throw new Error('Full name is required')
    if (password.length < 8) throw new Error('Password must be at least 8 characters')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name, phone } }
    })
    if (error) throw error
    return data
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  }

  function signOut() {
    setUser(null); setProfile(null); setSession(null); setVehicles([])
    supabase.auth.signOut()
  }

  async function refreshVehicles() {
    if (!user) return
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('owner_id', user.id)
    setVehicles(data || [])
  }

  return {
    user, session, profile, vehicles, loading,
    isAuthenticated: !!user,
    signIn, signUp, signOut, resetPassword, refreshVehicles
  }
}
