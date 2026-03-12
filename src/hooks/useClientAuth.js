import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useClientAuth() {
  const [user, setUser]         = useState(null)
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    // Hard timeout — always resolves no matter what
    const timeout = setTimeout(() => setLoading(false), 6000)

    // Check existing session first
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      clearTimeout(timeout)
      if (s?.user) {
        setSession(s)
        await hydrate(s.user)
      }
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log('Auth event:', event)

        if (event === 'SIGNED_IN') {
          setSession(s)
          await hydrate(s.user)
          setLoading(false)
        }

        if (event === 'SIGNED_OUT') {
          // Only sign out if we explicitly called signOut
          // Ignore auto sign-outs from unconfirmed email
          if (!s) {
            setUser(null)
            setProfile(null)
            setSession(null)
            setVehicles([])
          }
        }

        if (event === 'TOKEN_REFRESHED') {
          setSession(s)
        }

        if (event === 'USER_UPDATED') {
          setSession(s)
          if (s?.user) await hydrate(s.user)
        }
      }
    )

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  async function hydrate(u) {
    if (!u) return

    // Profile
    try {
      const { data: p, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      if (p && !error) {
        setUser(u)
        setProfile(p)
      } else {
        // Create profile if missing
        const name = u.user_metadata?.full_name
          || u.email?.split('@')[0]
          || 'Driver'

        const { data: newP } = await supabase
          .from('profiles')
          .upsert({
            id:               u.id,
            full_name:        name,
            phone:            u.user_metadata?.phone || null,
            role:             'driver',
            is_active:        true,
            clearance_level:  1,
            avatar_initials:  name[0].toUpperCase(),
          }, { onConflict: 'id' })
          .select()
          .single()

        setUser(u)
        setProfile(newP || { id: u.id, full_name: name, role: 'driver' })
      }
    } catch (e) {
      console.warn('Profile fetch failed:', e.message)
      // Never block — set bare minimum
      setUser(u)
      setProfile({
        id:        u.id,
        full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Driver',
        role:      'driver'
      })
    }

    // Vehicles — fail silently
    try {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', u.id)
      setVehicles(data || [])
    } catch {}
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Give a cleaner error for unconfirmed email
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email first, or ask admin to disable email confirmation.')
      }
      throw error
    }
    return data
  }

  async function signUp({ email, password, full_name, phone }) {
    if (!full_name) throw new Error('Full name is required')
    if (password.length < 8) throw new Error('Password must be at least 8 characters')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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
    setUser(null)
    setProfile(null)
    setSession(null)
    setVehicles([])
    supabase.auth.signOut()
  }

  async function refreshVehicles() {
    if (!user) return
    try {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', user.id)
      setVehicles(data || [])
    } catch {}
  }

  return {
    user, session, profile, vehicles, loading,
    isAuthenticated: !!user,
    signIn, signUp, signOut, resetPassword, refreshVehicles
  }
}
