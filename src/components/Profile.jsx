// da-app/src/components/Profile.jsx
// Vehicle registration with fleet join request + Kenya plate validation

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Kenya plate formats: KXX 000X | KXX 000 | Government/Diplomatic etc.
const PLATE_REGEX = /^[A-Z]{1,3}\s?\d{3,4}\s?[A-Z]?$/i;

const S = {
  wrap: { padding: '24px', background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' },
  header: { marginBottom: '28px' },
  title: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '20px' },
  sectionTitle: {
    fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    marginBottom: '16px', paddingBottom: '10px',
    borderBottom: '1px solid var(--border)',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  fieldFull: { display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' },
  label: { fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' },
  input: (err) => ({
    padding: '11px 14px', borderRadius: '8px',
    border: `1px solid ${err ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    fontSize: '14px', outline: 'none', transition: 'border 0.2s',
    width: '100%', boxSizing: 'border-box',
  }),
  select: {
    padding: '11px 14px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
    cursor: 'pointer', width: '100%', boxSizing: 'border-box',
  },
  error: { fontSize: '12px', color: 'var(--danger)', marginTop: '2px' },
  btn: (variant = 'primary') => ({
    padding: '12px 28px', borderRadius: '10px', border: 'none',
    cursor: 'pointer', fontWeight: 700, fontSize: '14px', transition: 'all 0.2s',
    background: variant === 'ghost' ? 'transparent' : variant === 'danger' ? 'var(--danger)' : 'var(--accent)',
    color: variant === 'ghost' ? 'var(--text-secondary)' : '#fff',
    border: variant === 'ghost' ? '1px solid var(--border)' : 'none',
  }),
  statusBadge: (status) => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
    background: status === 'verified' ? 'rgba(16,185,129,0.12)'
               : status === 'rejected' ? 'rgba(239,68,68,0.12)'
               : 'rgba(245,158,11,0.12)',
    color: status === 'verified' ? 'var(--success)'
          : status === 'rejected' ? 'var(--danger)'
          : 'var(--warning)',
    border: `1px solid ${status === 'verified' ? 'var(--success)' : status === 'rejected' ? 'var(--danger)' : 'var(--warning)'}`,
  }),
  feedbackBox: (status) => ({
    marginTop: '12px', padding: '12px 16px', borderRadius: '8px',
    background: status === 'verified' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
    border: `1px solid ${status === 'verified' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
    fontSize: '13px', color: 'var(--text-secondary)',
  }),
};

const emptyForm = {
  plate_number: '', make: '', model: '', year: '',
  color: '', engine_cc: '', chassis_number: '',
  owner_name: '', owner_phone: '', owner_id_number: '',
  fleet_id: '',
};

export default function Profile({ user }) {
  const [form, setForm]               = useState(emptyForm);
  const [errors, setErrors]           = useState({});
  const [registration, setReg]        = useState(null);
  const [fleets, setFleets]           = useState([]);
  const [fleetMembership, setFleetMembership] = useState(null);
  const [pendingFleetReq, setPendingFleetReq] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [editMode, setEditMode]       = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');

  useEffect(() => {
    if (user) {
      loadRegistration();
      loadFleets();
    }
  }, [user]);

  async function loadRegistration() {
    const { data } = await supabase
      .from('vehicle_registrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setReg(data);
      setForm({ ...emptyForm, ...data, fleet_id: '' });
      // Check fleet membership
      const { data: mem } = await supabase
        .from('fleet_memberships')
        .select('*, fleets(name)')
        .eq('vehicle_registration_id', data.id)
        .maybeSingle();
      setFleetMembership(mem || null);

      // Check pending join request
      if (!mem) {
        const { data: req } = await supabase
          .from('fleet_join_requests')
          .select('*, fleets(name)')
          .eq('vehicle_registration_id', data.id)
          .eq('status', 'pending')
          .maybeSingle();
        setPendingFleetReq(req || null);
      }
    } else {
      setEditMode(true); // new user — show form
    }
    setLoading(false);
  }

  async function loadFleets() {
    const { data } = await supabase
      .from('fleets')
      .select('id, name, description')
      .eq('is_active', true)
      .order('name');
    setFleets(data || []);
  }

  function validate() {
    const errs = {};
    if (!form.plate_number.trim()) errs.plate_number = 'Required';
    else if (!PLATE_REGEX.test(form.plate_number.trim())) errs.plate_number = 'Invalid Kenya plate format (e.g. KDA 123A)';
    if (!form.make.trim()) errs.make = 'Required';
    if (!form.model.trim()) errs.model = 'Required';
    if (!form.owner_name.trim()) errs.owner_name = 'Required';
    if (!form.owner_phone.trim()) errs.owner_phone = 'Required';
    if (form.year && (isNaN(form.year) || form.year < 1950 || form.year > new Date().getFullYear() + 1))
      errs.year = 'Invalid year';
    return errs;
  }

  async function save() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        plate_number: form.plate_number.trim().toUpperCase().replace(/\s+/g, ' '),
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year || null,
        color: form.color.trim(),
        engine_cc: form.engine_cc || null,
        chassis_number: form.chassis_number.trim(),
        owner_name: form.owner_name.trim(),
        owner_phone: form.owner_phone.trim(),
        owner_id_number: form.owner_id_number.trim(),
        is_verified: false,
        status: 'pending',
      };

      let regId;
      if (registration) {
        const { data, error } = await supabase
          .from('vehicle_registrations')
          .update({ ...payload, verified_feedback: null, verified_at: null, verified_by: null })
          .eq('id', registration.id)
          .select().single();
        if (error) throw error;
        regId = data.id;
        setReg(data);
      } else {
        const { data, error } = await supabase
          .from('vehicle_registrations')
          .insert(payload)
          .select().single();
        if (error) throw error;
        regId = data.id;
        setReg(data);
      }

      // Fleet join request
      if (form.fleet_id && regId) {
        // Check if already in a fleet or has pending request for this fleet
        const { data: existingReq } = await supabase
          .from('fleet_join_requests')
          .select('id')
          .eq('fleet_id', form.fleet_id)
          .eq('vehicle_registration_id', regId)
          .maybeSingle();

        if (!existingReq && !fleetMembership) {
          const { error: reqErr } = await supabase.from('fleet_join_requests').insert({
            fleet_id: form.fleet_id,
            vehicle_registration_id: regId,
            user_id: user.id,
          });
          if (!reqErr) {
            const fleet = fleets.find(f => f.id === form.fleet_id);
            setPendingFleetReq({ fleet: { name: fleet?.name } });
            setSuccessMsg(`Registration saved! Fleet join request sent to ${fleet?.name || 'fleet'}.`);
          }
        }
      } else {
        setSuccessMsg('Registration saved successfully! Awaiting admin verification.');
      }

      setEditMode(false);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  if (loading) {
    return (
      <div style={{ ...S.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading your profile...</div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={S.title}>Vehicle Registration</div>
        <div style={S.subtitle}>Registered vehicles are visible to the D.A mesh network</div>
      </div>

      {/* Verification status banner */}
      {registration && !editMode && (
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '20px', letterSpacing: '2px' }}>
                {registration.plate_number}
              </span>
              <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                {registration.make} {registration.model} {registration.year && `(${registration.year})`}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={S.statusBadge(registration.status || 'pending')}>
                {registration.status === 'verified' ? '✓' : registration.status === 'rejected' ? '✕' : '⏳'}
                {registration.status || 'Pending Review'}
              </span>
              <button style={S.btn('ghost')} onClick={() => setEditMode(true)}>
                Edit
              </button>
            </div>
          </div>

          {/* Admin feedback */}
          {registration.verified_feedback && (
            <div style={S.feedbackBox(registration.status)}>
              <strong>Admin Feedback:</strong> {registration.verified_feedback}
              {registration.verified_at && (
                <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  · {new Date(registration.verified_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Fleet status */}
          {fleetMembership && (
            <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '8px',
              background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>🚗 Fleet: </span>
              <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 700 }}>
                {fleetMembership.fleets?.name}
              </span>
              <button
                style={{ ...S.btn('ghost'), fontSize: '12px', padding: '4px 10px', marginLeft: '12px' }}
                onClick={requestExitFleet}
              >
                Request Exit
              </button>
            </div>
          )}

          {pendingFleetReq && !fleetMembership && (
            <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '8px',
              background: 'rgba(245,158,11,0.08)', border: '1px solid var(--warning)' }}>
              <span style={{ fontSize: '13px', color: 'var(--warning)' }}>
                ⏳ Join request to <strong>{pendingFleetReq.fleets?.name || pendingFleetReq.fleet?.name}</strong> is pending approval.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div style={{ ...S.feedbackBox('verified'), marginBottom: '16px' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Registration form */}
      {editMode && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Vehicle Details</div>
          <div style={S.grid}>
            <div style={{ ...S.field, gridColumn: '1 / -1' }}>
              <label style={S.label}>Number Plate *</label>
              <input
                style={{ ...S.input(errors.plate_number), fontFamily: 'monospace', fontWeight: 700, letterSpacing: '3px', fontSize: '18px', textTransform: 'uppercase' }}
                placeholder="KDA 123A"
                value={form.plate_number}
                onChange={e => set('plate_number', e.target.value.toUpperCase())}
              />
              {errors.plate_number && <span style={S.error}>{errors.plate_number}</span>}
            </div>

            <div style={S.field}>
              <label style={S.label}>Make *</label>
              <input style={S.input(errors.make)} placeholder="Toyota" value={form.make}
                onChange={e => set('make', e.target.value)} />
              {errors.make && <span style={S.error}>{errors.make}</span>}
            </div>

            <div style={S.field}>
              <label style={S.label}>Model *</label>
              <input style={S.input(errors.model)} placeholder="Harrier" value={form.model}
                onChange={e => set('model', e.target.value)} />
              {errors.model && <span style={S.error}>{errors.model}</span>}
            </div>

            <div style={S.field}>
              <label style={S.label}>Year</label>
              <input style={S.input(errors.year)} placeholder="2019" type="number" value={form.year}
                onChange={e => set('year', e.target.value)} />
              {errors.year && <span style={S.error}>{errors.year}</span>}
            </div>

            <div style={S.field}>
              <label style={S.label}>Color</label>
              <input style={S.input()} placeholder="Silver" value={form.color}
                onChange={e => set('color', e.target.value)} />
            </div>

            <div style={S.field}>
              <label style={S.label}>Engine CC</label>
              <input style={S.input()} placeholder="2400" type="number" value={form.engine_cc}
                onChange={e => set('engine_cc', e.target.value)} />
            </div>

            <div style={S.field}>
              <label style={S.label}>Chassis Number</label>
              <input style={S.input()} placeholder="JTNBV58E500..." value={form.chassis_number}
                onChange={e => set('chassis_number', e.target.value)} />
            </div>
          </div>

          <div style={{ ...S.sectionTitle, marginTop: '24px' }}>Owner Details</div>
          <div style={S.grid}>
            <div style={S.field}>
              <label style={S.label}>Full Name *</label>
              <input style={S.input(errors.owner_name)} placeholder="John Kamau" value={form.owner_name}
                onChange={e => set('owner_name', e.target.value)} />
              {errors.owner_name && <span style={S.error}>{errors.owner_name}</span>}
            </div>

            <div style={S.field}>
              <label style={S.label}>Phone *</label>
              <input style={S.input(errors.owner_phone)} placeholder="+254 700 000 000" value={form.owner_phone}
                onChange={e => set('owner_phone', e.target.value)} />
              {errors.owner_phone && <span style={S.error}>{errors.owner_phone}</span>}
            </div>

            <div style={S.field}>
              <label style={S.label}>National ID / KRA PIN</label>
              <input style={S.input()} placeholder="12345678 or A001..." value={form.owner_id_number}
                onChange={e => set('owner_id_number', e.target.value)} />
            </div>
          </div>

          {/* Fleet join */}
          {!fleetMembership && !pendingFleetReq && (
            <>
              <div style={{ ...S.sectionTitle, marginTop: '24px' }}>Join a Fleet (Optional)</div>
              <div style={S.field}>
                <label style={S.label}>Select Fleet</label>
                <select style={S.select} value={form.fleet_id} onChange={e => set('fleet_id', e.target.value)}>
                  <option value="">— Don't join any fleet —</option>
                  {fleets.map(f => (
                    <option key={f.id} value={f.id}>{f.name}{f.description ? ` · ${f.description}` : ''}</option>
                  ))}
                </select>
                {form.fleet_id && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    ℹ️ This sends a join request to the fleet admin. Your vehicle can only be in one fleet at a time.
                  </span>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button style={S.btn()} onClick={save} disabled={saving}>
              {saving ? 'Saving...' : registration ? 'Save Changes' : 'Submit Registration'}
            </button>
            {registration && (
              <button style={S.btn('ghost')} onClick={() => { setEditMode(false); setErrors({}); }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  async function requestExitFleet() {
    if (!fleetMembership || !registration) return;
    if (!confirm('Send a request to exit this fleet?')) return;

    const { error } = await supabase.from('fleet_exit_requests').insert({
      fleet_id: fleetMembership.fleet_id,
      vehicle_registration_id: registration.id,
      user_id: user.id,
    });

    if (!error) {
      alert('Exit request sent. You will be notified once the fleet admin responds.');
    } else {
      alert('Failed: ' + error.message);
    }
  }
}
