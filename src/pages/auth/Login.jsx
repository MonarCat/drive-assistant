import React, { useState } from 'react'
import { Eye, EyeOff, Loader, Radio } from 'lucide-react'

export default function Login({ onLogin, onSignUp, onForgot, onDemo }) {
  const [email, setEmail] = useState('')
  const [pw, setPw]       = useState('')
  const [show, setShow]   = useState(false)
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try { await onLogin(email, pw) }
    catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const inp = {
    width: '100%', background: 'rgba(0,212,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
    padding: '11px 14px', color: '#fff',
    fontFamily: "'Exo 2', sans-serif", fontSize: 13,
    outline: 'none', transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ height: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Exo 2', sans-serif" }}>
      <div style={{ width: 360 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.06)', marginBottom: 12 }}>
            <Radio size={24} color="#00d4ff" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 6, color: '#fff' }}>D<span style={{ color: '#00d4ff' }}>.</span>A</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginTop: 4 }}>DRIVE ASSISTANT</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '26px 24px' }}>
          <form onSubmit={submit}>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Email</div>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com" required style={inp}
                onFocus={e => e.target.style.borderColor = '#00d4ff'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Password</div>
              <div style={{ position: 'relative' }}>
                <input
                  type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                  placeholder="Your password" required
                  style={{ ...inp, paddingRight: 40 }}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button
                  type="button" onClick={() => setShow(!show)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  {show ? <EyeOff size={15} color="rgba(255,255,255,0.4)" /> : <Eye size={15} color="rgba(255,255,255,0.4)" />}
                </button>
              </div>
            </div>

            {err && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(255,45,68,0.08)', border: '1px solid rgba(255,45,68,0.3)', borderRadius: 6, fontSize: 11, color: '#ff2d44' }}>
                ⚠ {err}
              </div>
            )}

            <button
              type="submit" disabled={busy}
              style={{ width: '100%', padding: 13, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.35)', borderRadius: 7, color: '#00d4ff', fontSize: 13, fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, boxSizing: 'border-box' }}
            >
              {busy && <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />}
              {busy ? 'Signing in...' : 'Sign In'}
            </button>

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button
                type="button" onClick={onForgot}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer' }}
              >
                Forgot password?
              </button>
              <button
                type="button" onClick={onSignUp}
                style={{ background: 'none', border: 'none', color: '#00d4ff', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
              >
                Create account →
              </button>
            </div>

          </form>

          {/* Demo mode entry */}
          <div style={{ marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 10 }}>OR</div>
            <button
              type="button"
              onClick={onDemo || (() => {})}
              style={{ width: '100%', padding: '11px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, letterSpacing: 1, cursor: 'pointer', boxSizing: 'border-box', transition: 'border-color 0.2s, color 0.2s' }}
              onMouseEnter={e => { e.target.style.borderColor = 'rgba(0,212,255,0.4)'; e.target.style.color = '#00d4ff' }}
              onMouseLeave={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.color = 'rgba(255,255,255,0.55)' }}
            >
              Try Demo Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
