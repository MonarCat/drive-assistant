// At top of Profile.jsx replace imports for vehicle options:
import {
  REGISTRATION_CATEGORIES, MAKES, COLORS, YEARS,
  getModels, validatePlate, formatPlate, PLATE_HINT
} from '../utils/vehicleOptions.js'

// Replace vForm initial state:
const [vForm, setVForm] = useState({
  category: '', plate: '', make: '', model: '', year: '', color: ''
})

// Replace registerVehicle function:
async function registerVehicle(e) {
  e.preventDefault()
  setVErr('')

  if (!vForm.category) { setVErr('Select a registration category'); return }

  const validation = validatePlate(vForm.plate, vForm.category)
  if (!validation.valid) { setVErr(validation.error); return }

  // Check duplicate
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
    const { error } = await supabase
      .from('vehicles')
      .insert({
        owner_id:              user.id,
        plate:                 validation.plate,
        make:                  vForm.make,
        model:                 vForm.model,
        year:                  vForm.year ? Number(vForm.year) : null,
        color:                 vForm.color,
        vehicle_status:        'parked',
        is_active:             true,
        verification_status:   'pending',
        plate_format_valid:    true,
        registration_category: vForm.category,
      })
    if (error) throw error
    setAddingVehicle(false)
    setVForm({ category:'', plate:'', make:'', model:'', year:'', color:'' })
    await onRefreshVehicles()
  } catch(e) { setVErr(e.message) }
  finally { setVBusy(false) }
}

// Replace the vehicle form JSX inside {addingVehicle && (...)}:
{addingVehicle && (
  <form onSubmit={registerVehicle} style={{ ...S.card, borderColor:'rgba(0,255,157,0.15)' }}>
    <div style={{ fontSize:10, letterSpacing:2, color:'#00ff9d', marginBottom:14 }}>REGISTER VEHICLE</div>

    {/* Registration Category */}
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>Registration Category *</div>
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
        <div style={{ marginTop:4, fontSize:10, color:'rgba(255,255,255,0.25)' }}>
          {REGISTRATION_CATEGORIES.find(c=>c.id===vForm.category)?.description}
        </div>
      )}
    </div>

    {/* Plate */}
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>Number Plate *</div>
      <input
        type="text" value={vForm.plate}
        onChange={e => setV('plate', formatPlate(e.target.value))}
        placeholder={REGISTRATION_CATEGORIES.find(c=>c.id===vForm.category)?.example || 'e.g. KCA 001X'}
        required maxLength={12}
        disabled={!vForm.category}
        style={{
          ...S.inp, fontWeight:700, letterSpacing:2,
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
          ? <div style={{ marginTop:4, fontSize:10, color:'#00ff9d' }}>✓ Valid {v.type} plate</div>
          : <div style={{ marginTop:4, fontSize:10, color:'rgba(255,45,68,0.7)' }}>{v.error}</div>
      })()}
    </div>

    {/* Make */}
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>Make</div>
      <select className="da-select" value={vForm.make}
        onChange={e => { setV('make', e.target.value); setV('model','') }}>
        <option value="">Select make...</option>
        {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>

    {/* Model */}
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>Model</div>
      <select className="da-select" value={vForm.model}
        onChange={e => setV('model', e.target.value)}
        disabled={!vForm.make}>
        <option value="">Select model...</option>
        {getModels(vForm.make).map(m => <option key={m} value={m}>{m}</option>)}
        {vForm.make && <option value="Other">Other</option>}
      </select>
    </div>

    {/* Year + Color */}
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
      <div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>Year</div>
        <select className="da-select" value={vForm.year} onChange={e => setV('year', e.target.value)}>
          <option value="">Year...</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>Color</div>
        <select className="da-select" value={vForm.color} onChange={e => setV('color', e.target.value)}>
          <option value="">Color...</option>
          {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>

    {vErr && <div style={{ marginBottom:12, fontSize:11, color:'#ff2d44', padding:'8px 10px', background:'rgba(255,45,68,0.08)', borderRadius:6 }}>⚠ {vErr}</div>}

    <div style={{ display:'flex', gap:8 }}>
      <button type="submit" disabled={vBusy} style={{ ...S.btn('green'), flex:1 }}>
        {vBusy ? <Loader size={13} style={{animation:'spin 1s linear infinite'}}/> : <Car size={13}/>}
        {vBusy ? 'Registering...' : 'Register Vehicle'}
      </button>
      <button type="button" onClick={()=>setAddingVehicle(false)} style={{ ...S.btn('ghost'), flex:1 }}>Cancel</button>
    </div>
  </form>
)}
