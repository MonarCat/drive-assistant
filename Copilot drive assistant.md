# COPILOT PROMPT — MonarCat/drive-assistant
**Live URL:** https://drive-assistant-zeta.vercel.app
**Supabase:** wklhcmaodxatavuoduhd.supabase.co (same project as da-admin)
**Stack:** Vite 5 + React 18, Tailwind CSS 3, Leaflet (via CDN or npm — check index.html)
**Current version:** v0.1 (frontend simulation only)
**This prompt targets:** v0.2 — Supabase real-time backend

---

## ABSOLUTE RULES
1. ESM throughout — `import`/`export default` only, no `require()`.
2. Do not touch netlify.toml or netlify/functions/ — legacy, leave as-is.
3. Never hardcode Supabase keys. Use VITE_ prefix for all frontend env vars.
4. The vehicles, profiles, and vehicle_assignments tables already exist in Supabase
   (created by da-admin's 002_auth_schema.sql). Do not recreate them.
5. drive-assistant is the FIELD APP — it runs on the driver's phone as a PWA.
   It must be mobile-first, fast, and work on low-end Android devices.
6. Leaflet is likely already loaded. Check how the existing map is initialised
   before adding a second instance.

---

## TASK 1 — vercel.json (repo root)

Create this file. Without it, Vercel does not recognise the /api directory
as serverless functions and page refresh returns 404 on any non-root path.

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)",     "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin",  "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization,X-Vehicle-ID" }
      ]
    }
  ]
}
```

---

## TASK 2 — Install @supabase/supabase-js

Check package.json first. If supabase is not listed, install it:

```bash
npm install @supabase/supabase-js
```

---

## TASK 3 — src/lib/supabase.js (Supabase client)

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.error('[D.A] Supabase env vars missing. Check .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnon);
```

**Create .env in repo root (do not commit — add to .gitignore):**
```
VITE_SUPABASE_URL=https://wklhcmaodxatavuoduhd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Add in Vercel → drive-assistant → Settings → Environment Variables:**
```
VITE_SUPABASE_URL      = https://wklhcmaodxatavuoduhd.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
```

---

## TASK 4 — Supabase migration: vehicle_telemetry table

Run in Supabase SQL Editor for project wklhcmaodxatavuoduhd.
This table captures real-time GPS telemetry from the PWA on drivers' phones.

```sql
create table if not exists vehicle_telemetry (
  id          uuid default gen_random_uuid() primary key,
  vehicle_id  uuid references vehicles(id) on delete cascade not null,
  latitude    double precision not null,
  longitude   double precision not null,
  speed       numeric(6,2),             -- km/h
  heading     numeric(5,2),             -- degrees 0–360
  accuracy    numeric(6,2),             -- GPS accuracy in metres
  altitude    numeric(8,2),             -- metres above sea level
  recorded_at timestamptz not null default now(),
  session_id  uuid                      -- groups points from one trip
);

-- Index for fast lookups per vehicle, most recent first
create index on vehicle_telemetry (vehicle_id, recorded_at desc);

alter table vehicle_telemetry enable row level security;

-- Drivers can insert their own vehicle's telemetry
create policy "driver inserts own telemetry"
  on vehicle_telemetry for insert
  with check (
    exists (
      select 1 from vehicle_assignments va
      where va.vehicle_id = vehicle_telemetry.vehicle_id
        and va.user_id    = auth.uid()
        and va.is_active  = true
    )
  );

-- All authenticated users can read telemetry (da-admin map reads this)
create policy "authenticated read telemetry"
  on vehicle_telemetry for select
  using (auth.role() = 'authenticated');

-- Update vehicles.last_seen automatically on telemetry insert
create or replace function update_vehicle_last_seen()
returns trigger language plpgsql as $$
begin
  update vehicles
  set last_seen  = new.recorded_at,
      latitude   = new.latitude,
      longitude  = new.longitude,
      speed      = new.speed
  where id = new.vehicle_id;
  return new;
end;
$$;

create trigger trg_vehicle_last_seen
  after insert on vehicle_telemetry
  for each row execute function update_vehicle_last_seen();
```

Note: The trigger keeps the vehicles table up-to-date so da-admin's TacticalMap
always shows the latest position without querying vehicle_telemetry directly.

---

## TASK 5 — src/services/telemetry.js (GPS tracking service)

This service runs in the background while the driver has the PWA open.
It reads the device GPS and writes to vehicle_telemetry every 10 seconds.

```javascript
// src/services/telemetry.js
import { supabase } from '../lib/supabase.js';

let watchId      = null;
let sessionId    = null;
let vehicleId    = null;
let isTracking   = false;

function generateSessionId() {
  return crypto.randomUUID();
}

export async function startTracking(vehId) {
  if (isTracking) return;
  if (!navigator.geolocation) {
    console.warn('[Telemetry] Geolocation not supported');
    return;
  }

  vehicleId = vehId;
  sessionId = generateSessionId();
  isTracking = true;

  // Verify the driver is assigned to this vehicle
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { isTracking = false; return; }

  const { data: assignment } = await supabase
    .from('vehicle_assignments')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!assignment) {
    console.warn('[Telemetry] No active assignment for this vehicle');
    isTracking = false;
    return;
  }

  // Watch position — high accuracy, update every 10 seconds
  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, speed, heading, accuracy, altitude } = position.coords;

      const { error } = await supabase.from('vehicle_telemetry').insert({
        vehicle_id:  vehicleId,
        latitude,
        longitude,
        speed:       speed != null ? Math.round(speed * 3.6 * 100) / 100 : null, // m/s → km/h
        heading:     heading ?? null,
        accuracy:    accuracy ?? null,
        altitude:    altitude ?? null,
        session_id:  sessionId,
        recorded_at: new Date().toISOString(),
      });

      if (error) console.error('[Telemetry] Insert error:', error.message);
    },
    (err) => console.error('[Telemetry] Geolocation error:', err.message),
    {
      enableHighAccuracy: true,
      maximumAge:         10000,  // accept cached positions up to 10s old
      timeout:            15000,  // give GPS 15s to get a fix
    }
  );

  console.log('[Telemetry] Tracking started. Session:', sessionId);
}

export function stopTracking() {
  if (!isTracking) return;
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  isTracking = false;
  sessionId  = null;
  console.log('[Telemetry] Tracking stopped.');
}

export function isCurrentlyTracking() { return isTracking; }
```

---

## TASK 6 — src/services/auth.js (driver authentication)

Drivers log in with email/password. On login, their vehicle assignment is fetched.

```javascript
// src/services/auth.js
import { supabase } from '../lib/supabase.js';

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getSessionAndVehicle() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, vehicle: null, profile: null };

  // Fetch driver profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('clearance_level, role, badge_number, org_id')
    .eq('id', user.id)
    .single();

  // Fetch active vehicle assignment
  const { data: assignment } = await supabase
    .from('vehicle_assignments')
    .select('vehicle_id, assignment_role, vehicles(id, plate_number, status, zone)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  return {
    user,
    profile: profile ?? null,
    vehicle: assignment?.vehicles ?? null,
    vehicleId: assignment?.vehicle_id ?? null,
  };
}
```

---

## TASK 7 — Integrate tracking into the existing map component

Find the component that renders the existing Leaflet map (check your src/ folder —
likely named something like Map.jsx, LiveMap.jsx, VehicleMap.jsx, or App.jsx).

Add tracking start/stop to that component:

```jsx
// Add to whichever component handles the main map view
import { startTracking, stopTracking } from '../services/telemetry.js';
import { getSessionAndVehicle } from '../services/auth.js';
import { useEffect, useState } from 'react';

// Inside the component:
const [myVehicle, setMyVehicle] = useState(null);
const [tracking, setTracking]  = useState(false);

useEffect(() => {
  getSessionAndVehicle().then(({ vehicle, vehicleId }) => {
    setMyVehicle(vehicle);
    if (vehicleId) {
      startTracking(vehicleId);
      setTracking(true);
    }
  });
  return () => stopTracking(); // stop on unmount
}, []);
```

---

## TASK 8 — Real-time mesh: subscribe to all vehicle positions

Add this to the existing map component so other vehicles' positions update live.
This powers the "Vehicle Mesh" animated lines already in v0.1 — replace simulated
data with real Supabase data.

```javascript
// Add to the map component, after the map instance is created

import { supabase } from '../lib/supabase.js';

// Inside useEffect (after map setup):
async function loadAllVehicles() {
  const { data } = await supabase
    .from('vehicles')
    .select('id, plate_number, status, latitude, longitude, speed')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (!data) return;

  data.forEach(v => {
    // Update or create markers on the existing Leaflet map
    // Use the same marker logic already in v0.1 — just replace simulated coords
    // with v.latitude, v.longitude
  });
}

loadAllVehicles();

// Real-time subscription — updates whenever vehicles table changes
const channel = supabase
  .channel('da-mesh')
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'vehicles' },
    loadAllVehicles
  )
  .subscribe();

// Cleanup in return:
// return () => { supabase.removeChannel(channel); }
```

---

## TASK 9 — SOS real-time: write SOS alerts to Supabase

When a driver triggers SOS (already in v0.1 UI), write to a sos_alerts table
so da-admin can see it on the tactical grid.

```sql
-- Run in Supabase SQL Editor
create table if not exists sos_alerts (
  id           uuid default gen_random_uuid() primary key,
  vehicle_id   uuid references vehicles(id) on delete cascade,
  user_id      uuid references auth.users(id),
  latitude     double precision,
  longitude    double precision,
  message      text,
  resolved     boolean not null default false,
  resolved_by  uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

alter table sos_alerts enable row level security;

create policy "driver inserts own sos"
  on sos_alerts for insert
  with check (auth.uid() = user_id);

create policy "authenticated reads sos"
  on sos_alerts for select
  using (auth.role() = 'authenticated');
```

Wire the existing SOS button to insert:
```javascript
import { supabase } from '../lib/supabase.js';

async function triggerSOS(userId, vehicleId, position) {
  const { error } = await supabase.from('sos_alerts').insert({
    vehicle_id: vehicleId,
    user_id:    userId,
    latitude:   position?.coords.latitude ?? null,
    longitude:  position?.coords.longitude ?? null,
    message:    'EMERGENCY — DRIVER SOS ACTIVATED',
    created_at: new Date().toISOString(),
  });
  if (error) console.error('[SOS] Insert failed:', error.message);
}
```

---

## ACCEPTANCE CRITERIA — drive-assistant
- [ ] vercel.json exists at repo root, Vercel deploy passes
- [ ] @supabase/supabase-js in package.json
- [ ] src/lib/supabase.js initialises client from VITE_ env vars
- [ ] vehicle_telemetry table exists in Supabase with RLS enabled
- [ ] sos_alerts table exists in Supabase with RLS enabled
- [ ] startTracking() writes GPS coordinates to vehicle_telemetry every ~10s
- [ ] stopTracking() clears the geolocation watch on component unmount
- [ ] Existing map shows real vehicle positions from Supabase (not simulated)
- [ ] Supabase real-time subscription updates map markers when vehicles move
- [ ] SOS button writes to sos_alerts table with driver's current GPS position
- [ ] npm run build has zero errors
- [ ] PWA installs correctly on Android Chrome (test on a real device)
