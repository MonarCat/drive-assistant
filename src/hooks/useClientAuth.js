import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const TIMEOUT_MS = 5000

export function useClientAuth() {
  const [user, setUser]         = useState(null)
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    // Hard timeout — always resolves
    const timeout = setTimeout(() => {
      console.warn('Client auth timeout — forcing loading false')
      setLoading(false)
    }, TIMEOUT_MS)

    supabase.auth.getSession().then(async ({ data: { session: s }, error }) => {
      clearTimeout(timeout)
      if (error || !s?.user) {
        setLoading(false)
        return
      }
      setSession(s)
      await hydrate(s.user)
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_OUT') {
        setUser(null); setProfile(null); setSession(null); setVehicles([])
      }
      if (event === 'SIGNED_IN' && s?.user) {
        setSession(s)
        await hydrate(s.user)
      }
    })

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  async function hydrate(u) {
    // Profile
    try {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      if (p) {
        setUser(u); setProfile(p)
      } else {
        // Auto-create
        const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Driver'
        const { data: newP } = await supabase
          .from('profiles')
          .insert({
            id: u.id, full_name: name,
            phone: u.user_metadata?.phone || null,
            role: 'driver', is_active: true,
            clearance_level: 1,
            avatar_initials: name[0].toUpperCase(),
          })
          .select().single()
        setUser(u)
        setProfile(newP || { id: u.id, full_name: name, role: 'driver' })
      }
    } catch {
      // Never block — set bare minimum
      setUser(u)
      setProfile({ id: u.id, full_name: u.email?.split('@')[0], role: 'driver' })
    }

    // Vehicles — fail silently, don't block login
    try {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', u.id)
      setVehicles(data || [])
    } catch (e) {
      console.warn('Vehicles fetch error (non-blocking):', e?.message)
    }
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
    if (!email) return
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://da-app.netlify.app/reset-password'
    })
    if (error) throw error
  }

  function signOut() {
    setUser(null); setProfile(null); setSession(null); setVehicles([])
    supabase.auth.signOut()
  }

  async function refreshVehicles() {
    if (!user) return
    try {
      const { data } = await supabase
        .from('vehicles').select('*').eq('owner_id', user.id)
      setVehicles(data || [])
    } catch (e) {
      console.warn('refreshVehicles error (non-blocking):', e?.message)
    }
  }

  return {
    user, session, profile, vehicles, loading,
    isAuthenticated: !!user,
    signIn, signUp, signOut, resetPassword, refreshVehicles
  }
}
