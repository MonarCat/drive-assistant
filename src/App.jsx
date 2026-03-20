import React, { useState, useEffect } from 'react'
import { useClientAuth } from './hooks/useClientAuth.js'
import Login     from './pages/auth/Login.jsx'
import SignUp    from './pages/auth/SignUp.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile   from './pages/Profile.jsx'
import UserInbox from './components/UserInbox.jsx'
 
export default function App() {
  const { user, profile, vehicles, loading, isDemo, signIn, signUp, signOut, resetPassword, refreshVehicles, enterDemo } = useClientAuth()
  const [page, setPage] = useState('login')
  const [loadingLong, setLoadingLong] = useState(false)
 
  useEffect(() => { if (user && page === 'login') setPage('dashboard'); if (!user && !loading) setPage('login') }, [user, loading])
  useEffect(() => { if (!loading) return; const t = setTimeout(() => setLoadingLong(true), 4000); return () => clearTimeout(t) }, [loading])
 
  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0e1a', flexDirection:'column', gap:14 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid rgba(0,212,255,0.15)', borderTop:'2px solid #00d4ff', animation:'spin 1s linear infinite' }}/>
      <span style={{ fontSize:10, letterSpacing:4, color:'#00d4ff', fontFamily:"'Exo 2',sans-serif" }}>D.A LOADING...</span>
      {loadingLong && <button onClick={() => window.location.reload()} style={{ fontSize:11, color:'rgba(0,212,255,0.6)', background:'none', border:'none', textDecoration:'underline', cursor:'pointer' }}>Tap to retry</button>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
 
  if (!user) {
    if (page === 'signup') return <SignUp onSignUp={signUp} onBack={() => setPage('login')} />
    return <Login onLogin={signIn} onSignUp={() => setPage('signup')} onForgot={resetPassword} onDemo={enterDemo} />
  }
 
  if (page === 'profile') return (
    <Profile user={user} profile={profile} vehicles={vehicles} isDemo={isDemo}
      onSignOut={signOut} onBack={() => setPage('dashboard')} onRefreshVehicles={refreshVehicles} />
  )
 
  if (page === 'inbox') return (
    <UserInbox user={user} onBack={() => setPage('dashboard')} />
  )
 
  return (
    <Dashboard user={user} profile={profile} vehicles={vehicles} isDemo={isDemo}
      onSignOut={signOut} onRefreshVehicles={refreshVehicles}
      onOpenProfile={() => setPage('profile')}
      onOpenInbox={() => setPage('inbox')} />
  )
}
