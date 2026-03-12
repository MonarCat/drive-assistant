import React, { useState } from 'react'
import { Loader, CheckCircle, Radio, ArrowLeft } from 'lucide-react'

export default function SignUp({ onSignUp, onBack }) {
  const [busy, setBusy]   = useState(false)
  const [done, setDone]   = useState(false)
  const [err, setErr]     = useState('')
  const [form, setForm]   = useState({ full_name: '', phone: '', email: '', password: '', confirm: '' })

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function submit(e) {
    e.preventDefault(); setErr('')
    if (form.password !== form.confirm) { setErr('Passwords do not match'); return }
    if (form.password.length < 8) { setErr('Password must be at least 8 characters'); return }
    setBusy(true)
    try {
      await onSignUp({ email: form.email, password: form.password, full_name: form.full_name, phone: form.phone })
      setDone(true)
    } catch (e) {
      setErr(e.message?.includes('already registered') ? 'An account with this email already exists.' : e.message)
    } finally { setBusy(false) }
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
      <div style={{ width: 380 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.06)', marginBottom: 12 }}>
            <Radio size={24} color="#00d4ff" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 6, color: '#fff' }}>D<span style={{ color: '#00d4ff' }}>.</span>A</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginTop: 4 }}>CREATE ACCOUNT</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '26px 24px' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <CheckCircle size={40} color="#00ff9d" style={{ margin: '0 auto 16px', display: 'block' }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Welcome to D.A!</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 22, lineHeight: 1.7 }}>
                Account created for <span style={{ color: '#00d4ff' }}>{form.email}</span>.<br />
                Check your email to confirm if required.
              </div>
              <button
                onClick={onBack}
                style={{ padding: '12px 28px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.4)', borderRadius: 7, color: '#00d4ff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Sign In →
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {[
                ['Full Name', 'full_name', 'text', 'Your full name'],
                ['Phone (optional)', 'phone', 'tel', '+254 7XX XXX XXX'],
                ['Email', 'email', 'email', 'you@email.com'],
              ].map(([label, k, type, ph]) => (
                <div key={k} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label}</div>
                  <input
                    type={type} value={form[k]} onChange={e => set(k, e.target.value)}
                    placeholder={ph} required={k !== 'phone'} style={inp}
                    onFocus={e => e.target.style.borderColor = '#00d4ff'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Password</div>
                <input
                  type="password" value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Min 8 characters" required style={inp}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Confirm Password</div>
                <input
                  type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)}
                  placeholder="Repeat password" required
                  style={{ ...inp, borderColor: form.confirm && form.confirm !== form.password ? '#ff2d44' : 'rgba(255,255,255,0.1)' }}
                  onFocus={e => e.target.style.borderColor = '#00d4ff'}
                  onBlur={e => e.target.style.borderColor = form.confirm && form.confirm !== form.password ? '#ff2d44' : 'rgba(255,255,255,0.1)'}
                />
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
                {busy ? 'Creating account...' : 'Create Account'}
              </button>

              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

              <button
                type="button" onClick={onBack}
                style={{ width: '100%', padding: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: 'rgba(255,255,255,0.3)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <ArrowLeft size={12} /> Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
