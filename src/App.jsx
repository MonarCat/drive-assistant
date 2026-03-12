import React, { useState } from 'react'
import { useClientAuth } from './hooks/useClientAuth.js'
import Login    from './pages/auth/Login.jsx'
import SignUp   from './pages/auth/SignUp.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile   from './pages/Profile.jsx'

export default function App() {
  const {
    user, profile, vehicles, loading,
    signIn, signUp, signOut, resetPassword, refreshVehicles
  } = useClientAuth()

  const [page, setPage]        = useState('login')
  const [showProfile, setShowProfile] = useState(false)

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(0,212,255,0.15)', borderTop: '2px solid #00d4ff', animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 10, letterSpacing: 4, color: '#00d4ff', fontFamily: "'Exo 2', sans-serif" }}>D.A LOADING...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (user && showProfile) return (
    <Profile
      user={user}
      profile={profile}
      vehicles={vehicles}
      onSignOut={signOut}
      onBack={() => setShowProfile(false)}
      onRefreshVehicles={refreshVehicles}
    />
  )

  if (user) return (
    <Dashboard
      user={user}
      profile={profile}
      vehicles={vehicles}
      onSignOut={signOut}
      onRefreshVehicles={refreshVehicles}
      onShowProfile={() => setShowProfile(true)}
    />
  )

  if (page === 'signup') return (
    <SignUp
      onSignUp={signUp}
      onBack={() => setPage('login')}
    />
  )

  return (
    <Login
      onLogin={signIn}
      onSignUp={() => setPage('signup')}
      onForgot={() => {
        const email = prompt('Enter your email:')
        if (email) resetPassword(email)
      }}
    />
  )
}
