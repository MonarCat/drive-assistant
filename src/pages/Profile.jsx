import React, { useState } from 'react'
import { User, Phone, Mail, Car, Edit2, CheckCircle, Loader, LogOut, Plus, Shield, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import {
  REGISTRATION_CATEGORIES, MAKES, COLORS, YEARS,
  getModels, validatePlate, formatPlate, PLATE_HINT
} from '../utils/vehicleOptions.js'

const EMPTY_VFORM = { category: '', plate: '', make: '', model: '', year: '', color: '' }

export default function Profile({ user, profile, vehicles, onSignOut, onBack, onRefreshVehicles }) {
  const [tab, setTab]         = useState('profile') // 'profile' | 'vehicles' | 'security'
  const [editing, setEditing] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [saved, setSaved]     = useState(false)
  const [err, setErr]         = useState('')
  const [form, setForm]       = useState({
    full_name: profile?.full_name || '',
    phone:     profile?.phone     || '',
  })

  // Vehicle registration form
  const [addingVehicle, setAddingVehicle] = useState(false)
  const [vBusy, setVBusy]   = useState(false)
  const [vErr, setVErr]     = useState('')
  const [vForm, setVForm]   = useState(EMPTY_VFORM)

  function set(k, v)  { setForm(p => ({ ...p, [k]: v })) }
  function setV(k, v) { setVForm(p => ({ ...p, [k]: v })) }

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const TIER_COLOR = { free: '#666', premium: '#00d4ff', fleet: '#ffd700', government: '#a855f7' }
  const tier = profile?.subscription_tier || 'free'

  async function saveProfile(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name, phone: form.phone, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) throw error
      setSaved(true); setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  async function registerVehicle(e) {
    e.preventDefault()
    setVErr('')

    // Validate category first
    if (!vForm.category) {
      setVErr('Select a registration category')
      return
    }

    // Validate plate format against selected category
    const validation = validatePlate(vForm.plate, vForm.category)
    if (!validation.valid) {
      setVErr(validation.error)
      return
    }

    // Check for duplicate plate
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('plate', validation.plate)
      .maybeSingle()

    if (existing) {
      setVErr('This plate is already registered. Contact support if this is your vehicle.')
      return
    }

    setVBusy(true)
    try {
      // 1. Insert the vehicle
      const { data: newVehicle, error: vError } = await supabase
        .from('vehicles')
        .insert({
          owner_id:              user.id,
          plate:                 validation.plate,
          make:                  vForm.make   || null,
          model:                 vForm.model  || null,
          year:                  vForm.year   ? Number(vForm.year) : null,
          color:                 vForm.color  || null,
          vehicle_status:        'parked',
          is_active:             true,
          verification_status:   'pending',
          plate_format_valid:    true,
          registration_category: vForm.category,
        })
        .select()
        .single()

      if (vError) throw vError

      // 2. Write admin notification directly to Supabase
      //    No cross-origin fetch needed — anon key has insert permission via RLS policy
      const catLabel = {
        private:'Private', government:'Government', diplomat:'Diplomat',
        police:'Police', military:'KDF', psv:'PSV',
        ngo:'NGO', foreign:'Foreign', commercial:'Commercial',
      }[vForm.category] || vForm.category

      await supabase.from('notifications').insert({
        type:         'vehicle_registered',
        title:        `New vehicle: ${validation.plate}`,
        body:         `${profile?.full_name || 'A driver'} registered a ${vForm.year || ''} ${vForm.make || ''} ${vForm.model || ''} (${catLabel}) — awaiting verification`.trim(),
        vehicle_id:   newVehicle.id,
        from_user_id: user.id,
        to_role:      'admin',
        read:         false,
      })

      // 3. Reset form and refresh
      setAddingVehicle(false)
      setVForm(EMPTY_VFORM)
      if (onRefreshVehicles) await onRefreshVehicles()

    } catch (err) {
      // Surface the actual Supabase error — no more silent failures
      console.error('Vehicle registration error:', err)
      setVErr(err.message || 'Registration failed. Please try again.')
    } finally {
      setVBusy(false)
    }
  }

  // ── Styles ──────────────────────────────────────────────
  const S = {
    page:    { minHeight: '100vh', background: '#0a0e1a', color: '#fff', fontFamily: "'Exo 2',sans-serif" },
    header:  { padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 },
    backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 },
    body:    { maxWidth: 480, margin: '0 auto', padding: '24px 20px' },
    card:    { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 16px', marginBottom: 14 },
    label:   { fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', marginBottom: 12 },
    inp:     { width: '100%', background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 13px', color: '#fff', fontFamily: "'Exo 2',sans-serif", fontSize: 13, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' },
    tab:     (active) => ({ padding: '8px 16px', background: active ? 'rgba(0,212,255,0.1)' : 'transparent', border: active ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent', borderRadius: 6, color: active ? '#00d4ff' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }),
    btn:     (variant = 'primary') => ({
      padding: '11px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      ...(variant === 'primary' ? { background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.35)', color: '#00d4ff' }               : {}),
      ...(variant === 'ghost'   ? { background: 'transparent',         border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' } : {}),
      ...(variant === 'danger'  ? { background: 'transparent',         border: '1px solid rgba(255,45,68,0.25)',   color: 'rgba(255,45,68,0.7)' }   : {}),
      ...(variant === 'green'   ? { background: 'rgba(0,255,157,0.07)', border: '1px solid rgba(0,255,157,0.25)',  color: '#00ff9d' }               : {}),
    }),
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>
          <ChevronLeft size={16} />
          Back
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 11, letterSpacing: 3, color: 'rgba(255,255,255,0.3)' }}>
          PROFILE
        </span>
      </div>

      <div style={S.body}>
        {/* Avatar / name card */}
        <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: `2px solid ${TIER_COLOR[tier]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: TIER_COLOR[tier], flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name || user?.email}
            </div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: TIER_COLOR[tier] }}>
              {tier.toUpperCase()} TIER
            </div>
          </div>
          {saved && <CheckCircle size={18} color="#00ff9d" />}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {['profile', 'vehicles', 'security'].map(t => (
            <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Profile tab ── */}
        {tab === 'profile' && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={S.label}>PERSONAL INFO</span>
              {!editing && (
                <button style={{ ...S.btn('ghost'), padding: '5px 10px', fontSize: 11 }} onClick={() => setEditing(true)}>
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={saveProfile}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Full Name</div>
                  <input style={S.inp} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Phone</div>
                  <input style={S.inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+254 7XX XXX XXX" type="tel" />
                </div>
                {err && (
                  <div style={{ marginBottom: 12, padding: '7px 11px', background: 'rgba(255,45,68,0.08)', border: '1px solid rgba(255,45,68,0.3)', borderRadius: 5, fontSize: 11, color: '#ff2d44' }}>
                    ⚠ {err}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={busy} style={{ ...S.btn('primary'), flex: 1 }}>
                    {busy ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
                    {busy ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" style={{ ...S.btn('ghost'), flex: 1 }} onClick={() => { setEditing(false); setErr('') }}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <InfoRow icon={<User size={13} />}  label="Name"  value={profile?.full_name || '—'} />
                <InfoRow icon={<Mail size={13} />}  label="Email" value={user?.email || '—'} />
                <InfoRow icon={<Phone size={13} />} label="Phone" value={profile?.phone || '—'} last />
              </div>
            )}
          </div>
        )}

        {/* ── Vehicles tab ── */}
        {tab === 'vehicles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ ...S.label, marginBottom: 0 }}>MY VEHICLES</span>
              <button style={{ ...S.btn('primary'), padding: '6px 12px', fontSize: 11 }} onClick={() => setAddingVehicle(true)}>
                <Plus size={12} /> Add Vehicle
              </button>
            </div>

            {addingVehicle && (
              <form onSubmit={registerVehicle} style={{ ...S.card, borderColor: 'rgba(0,255,157,0.15)' }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: '#00ff9d', marginBottom: 14 }}>REGISTER VEHICLE</div>

                {/* Registration Category */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Registration Category *</div>
                  <select
                    className="da-select"
                    value={vForm.category}
                    onChange={e => setV('category', e.target.value)}
                    required
                  >
                    <option value="">Select category...</option>
                    {REGISTRATION_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label} — {c.example}</option>
                    ))}
                  </select>
                  {vForm.category && (
                    <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                      {REGISTRATION_CATEGORIES.find(c => c.id === vForm.category)?.description}
                    </div>
                  )}
                </div>

                {/* Plate */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Number Plate *</div>
                  <input
                    type="text" value={vForm.plate}
                    onChange={e => setV('plate', formatPlate(e.target.value))}
                    placeholder={REGISTRATION_CATEGORIES.find(c => c.id === vForm.category)?.example || PLATE_HINT}
                    required maxLength={12}
                    disabled={!vForm.category}
                    style={{
                      ...S.inp, fontWeight: 700, letterSpacing: 2,
                      opacity: vForm.category ? 1 : 0.4,
                      borderColor: vForm.plate && vForm.category
                        ? validatePlate(vForm.plate, vForm.category).valid
                          ? 'rgba(0,255,157,0.5)' : 'rgba(255,45,68,0.5)'
                        : 'rgba(255,255,255,0.1)'
                    }}
                  />
                  {vForm.plate && vForm.category && (() => {
                    const v = validatePlate(vForm.plate, vForm.category)
                    return v.valid
                      ? <div style={{ marginTop: 4, fontSize: 10, color: '#00ff9d' }}>✓ Valid {v.type} plate</div>
                      : <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,45,68,0.7)' }}>{v.error}</div>
                  })()}
                </div>

                {/* Make */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Make</div>
                  <select className="da-select" value={vForm.make}
                    onChange={e => { setV('make', e.target.value); setV('model', '') }}>
                    <option value="">Select make...</option>
                    {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Model */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Model</div>
                  <select className="da-select" value={vForm.model}
                    onChange={e => setV('model', e.target.value)}
                    disabled={!vForm.make}>
                    <option value="">Select model...</option>
                    {getModels(vForm.make).map(m => <option key={m} value={m}>{m}</option>)}
                    {vForm.make && <option value="Other">Other</option>}
                  </select>
                </div>

                {/* Year + Color */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Year</div>
                    <select className="da-select" value={vForm.year} onChange={e => setV('year', e.target.value)}>
                      <option value="">Year...</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Color</div>
                    <select className="da-select" value={vForm.color} onChange={e => setV('color', e.target.value)}>
                      <option value="">Color...</option>
                      {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {vErr && <div style={{ marginBottom: 12, fontSize: 11, color: '#ff2d44', padding: '8px 10px', background: 'rgba(255,45,68,0.08)', borderRadius: 6 }}>⚠ {vErr}</div>}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={vBusy} style={{ ...S.btn('green'), flex: 1 }}>
                    {vBusy ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Car size={13} />}
                    {vBusy ? 'Registering...' : 'Register Vehicle'}
                  </button>
                  <button type="button" onClick={() => { setAddingVehicle(false); setVErr('') }} style={{ ...S.btn('ghost'), flex: 1 }}>Cancel</button>
                </div>
              </form>
            )}

            {vehicles && vehicles.length > 0 ? (
              vehicles.map(v => (
                <div key={v.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Car size={16} color="#00d4ff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>{v.plate}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                      {[v.color, v.make, v.model, v.year].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: 1, padding: '3px 8px', borderRadius: 4, background: v.vehicle_status === 'moving' ? 'rgba(0,255,157,0.08)' : 'rgba(255,255,255,0.04)', color: v.vehicle_status === 'moving' ? '#00ff9d' : 'rgba(255,255,255,0.3)', border: `1px solid ${v.vehicle_status === 'moving' ? 'rgba(0,255,157,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                    {(v.vehicle_status || 'parked').toUpperCase()}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ ...S.card, textAlign: 'center', padding: '32px 16px' }}>
                <Car size={28} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No vehicles registered yet</div>
              </div>
            )}
          </div>
        )}

        {/* ── Security tab ── */}
        {tab === 'security' && (
          <div>
            <div style={S.card}>
              <div style={{ ...S.label, marginBottom: 14 }}>ACCOUNT SECURITY</div>
              <InfoRow icon={<Shield size={13} />} label="Role"  value={(profile?.role || 'driver').toUpperCase()} />
              <InfoRow icon={<Mail size={13} />}   label="Email" value={user?.email || '—'} last />
            </div>
            <button style={{ ...S.btn('danger'), width: '100%', marginTop: 8 }} onClick={onSignOut}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function InfoRow({ icon, label, value, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: last ? 0 : 12, marginBottom: last ? 0 : 12, borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: 'rgba(255,255,255,0.25)', display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.3)', width: 44 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}
