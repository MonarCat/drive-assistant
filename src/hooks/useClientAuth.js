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
    const timeout = setTimeout(() => setLoading(false), 6000)

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      clearTimeout(timeout)
      if (s?.user) { setSession(s); await hydrate(s.user) }
      setLoading(false)
    }).catch(() => { clearTimeout(timeout); setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log('Auth event:', event)
        if (event === 'SIGNED_IN' && s?.user) {
          setSession(s); await hydrate(s.user); setLoading(false)
        }
        if (event === 'SIGNED_OUT' && !isDemo) {
          setUser(null); setProfile(null); setSession(null); setVehicles([])
        }
      }
    )

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  async function hydrate(u) {
    try {
      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', u.id).single()

      if (p) { setUser(u); setProfile(p) }
      else {
        const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Driver'
        const { data: newP } = await supabase
          .from('profiles')
          .upsert({ id:u.id, full_name:name, phone:u.user_metadata?.phone||null, role:'driver', is_active:true, clearance_level:1, avatar_initials:name[0].toUpperCase() }, { onConflict:'id' })
          .select().single()
        setUser(u)
        setProfile(newP || { id:u.id, full_name:name, role:'driver' })
      }
    } catch {
      setUser(u)
      setProfile({ id:u.id, full_name:u.email?.split('@')[0], role:'driver' })
    }

    try {
      const { data } = await supabase
        .from('vehicles').select('*').eq('owner_id', u.id)
      setVehicles(data || [])
    } catch {}
  }

  // ── DEMO MODE — completely isolated, no DB calls ──────
  function enterDemo() {
    setIsDemo(true)
    setLoading(false)
    setUser({ id:'demo', email:'demo@da.local' })
    setProfile(DEMO_PROFILE)
    setVehicles(DEMO_VEHICLES.slice(0, 2)) // show 2 demo vehicles for driver
  }

  function exitDemo() {
    setIsDemo(false)
    setUser(null); setProfile(null)
    setSession(null); setVehicles([])
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Email not confirmed'))
        throw new Error('Please confirm your email first.')
      throw error
    }
    return data
  }

  async function signUp({ email, password, full_name, phone }) {
    if (!full_name) throw new Error('Full name is required')
    if (password.length < 8) throw new Error('Password must be at least 8 characters')
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name, phone } }
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
    if (isDemo) { exitDemo(); return }
    setUser(null); setProfile(null); setSession(null); setVehicles([])
    supabase.auth.signOut()
  }

  async function refreshVehicles() {
    if (isDemo || !user) return
    try {
      const { data } = await supabase
        .from('vehicles').select('*').eq('owner_id', user.id)
      setVehicles(data || [])
    } catch {}
  }

  return {
    user, session, profile, vehicles, loading, isDemo,
    isAuthenticated: !!user,
    signIn, signUp, signOut, resetPassword, refreshVehicles,
    enterDemo, exitDemo,
  }
}
