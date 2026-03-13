import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { DEMO_VEHICLES, DEMO_PROFILE } from '../utils/vehicleOptions.js'

export function useClientAuth() {
  const [user, setUser]         = useState(null)
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [isDemo, setIsDemo]     = useState(false)

  useEffect(() => {
    // Hard timeout — loading NEVER hangs beyond 8s
    const timeout = setTimeout(() => {
      console.warn('Auth hard timeout hit')
      setLoading(false)
    }, 8000)

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        setSession(s)
        await hydrate(s.user)
      }
      clearTimeout(timeout)
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log('Auth event:', event)
        if (event === 'SIGNED_IN' && s?.user) {
          setSession(s)
          await hydrate(s.user)
          setLoading(false) // ← always resolve after sign-in
        }
        if (event === 'SIGNED_OUT') {
          if (!isDemo) {
            setUser(null); setProfile(null)
            setSession(null); setVehicles([])
          }
          setLoading(false)
        }
      }
    )

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  async function hydrate(u) {
    // Never throw — always resolve gracefully
    try {
      const { data: p, error } = await supabase
        .from('profiles').select('*').eq('id', u.id).single()

      if (p && !error) {
        setUser(u); setProfile(p)
      } else {
        // Profile missing — create it inline
        const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Driver'
        await supabase.from('profiles').upsert({
          id: u.id,
          full_name: name,
          phone: u.user_metadata?.phone || null,
          role: 'driver',
          is_active: true,
          clearance_level: 1,
          avatar_initials: name[0].toUpperCase(),
        }, { onConflict: 'id' })
        setUser(u)
        setProfile({ id: u.id, full_name: name, role: 'driver', clearance_level: 1 })
      }
    } catch {
      // Even if profile fails entirely, sign the user in with minimal data
      setUser(u)
      setProfile({ id: u.id, full_name: u.email?.split('@')[0] || 'Driver', role: 'driver' })
    }

    // Load vehicles — silently skip if RLS blocks
    try {
      const { data } = await supabase
        .from('vehicles').select('*').eq('owner_id', u.id)
      setVehicles(data || [])
    } catch {
      setVehicles([])
    }
  }

  // ── DEMO MODE — zero DB contact ──────────────────────
  function enterDemo() {
    setIsDemo(true)
    setUser({ id: 'demo', email: 'demo@da.local' })
    setProfile(DEMO_PROFILE)
    setVehicles(DEMO_VEHICLES.slice(0, 2))
    setLoading(false)
  }

  function exitDemo() {
    setIsDemo(false)
    setUser(null); setProfile(null)
    setSession(null); setVehicles([])
  }

  async function signIn(email, password) {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    } catch (e) {
      setLoading(false)
      if (e.message.includes('Email not confirmed'))
        throw new Error('Please check your email and confirm your account first.')
      throw e
    }
  }

  async function signUp({ email, password, full_name, phone }) {
    if (!full_name?.trim()) throw new Error('Full name is required')
    if (password.length < 8) throw new Error('Password must be at least 8 characters')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: full_name.trim(), phone: phone || null } }
    })
    if (error) throw error
    return data
  }

  async function resetPassword(email) {
    if (!email?.trim()) throw new Error('Enter your email first')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://da-app.netlify.app/reset-password'
    })
    if (error) throw error
  }

  function signOut() {
    if (isDemo) { exitDemo(); return }
    setUser(null); setProfile(null); setSession(null); setVehicles([])
    supabase.auth.signOut()
  }

  async function refreshVehicles() {
    if (isDemo || !user?.id || user.id === 'demo') return
    try {
      const { data } = await supabase
        .from('vehicles').select('*').eq('owner_id', user.id)
      setVehicles(data || [])
    } catch {}
  }

  return {
    user, session, profile, vehicles, loading, isDemo,
    isAuthenticated: !!user,
    signIn, signUp, signOut, resetPassword,
    refreshVehicles, enterDemo, exitDemo,
  }
}
