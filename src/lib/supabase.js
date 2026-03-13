-- ── FLEETS ────────────────────────────────────────────────
-- An admin can own/manage one or more fleets
-- Vehicles are assigned to a fleet
CREATE TABLE IF NOT EXISTS fleets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  type         TEXT DEFAULT 'private'
    CHECK (type IN ('private','government','police','military','insurance',
                    'bank','car_sales','ngo','psv','super_admin')),
  owner_id     UUID REFERENCES profiles(id),   -- the fleet admin
  org_id       UUID REFERENCES organizations(id),
  description  TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Assign vehicles to fleets
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS fleet_id UUID REFERENCES fleets(id);

-- Fleet membership — which admins manage which fleets
CREATE TABLE IF NOT EXISTS fleet_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id   UUID REFERENCES fleets(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'viewer'
    CHECK (role IN ('owner','manager','viewer')),
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fleet_id, profile_id)
);

-- ── AI AGENT SESSIONS ─────────────────────────────────────
-- Tracks OpenClaw / AI agent activity on D.A
CREATE TABLE IF NOT EXISTS agent_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name   TEXT NOT NULL,              -- 'da-sos-monitor', 'da-briefing' etc
  fleet_id     UUID REFERENCES fleets(id),
  triggered_by TEXT DEFAULT 'scheduled',  -- 'scheduled','event','manual'
  input        JSONB,
  output       JSONB,
  status       TEXT DEFAULT 'running'
    CHECK (status IN ('running','completed','failed')),
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ── RLS: FLEETS ───────────────────────────────────────────
ALTER TABLE fleets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleets_owner_all"
  ON fleets FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "fleets_member_select"
  ON fleets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fleet_members
      WHERE fleet_id = fleets.id AND profile_id = auth.uid()
    )
  );

CREATE POLICY "fleets_super_admin_all"
  ON fleets FOR ALL
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "fleets_service_all"
  ON fleets FOR ALL
  USING (auth.role() = 'service_role');

-- ── RLS: FLEET MEMBERS ────────────────────────────────────
ALTER TABLE fleet_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_members_owner_all"
  ON fleet_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = fleet_members.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

CREATE POLICY "fleet_members_self_select"
  ON fleet_members FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "fleet_members_service_all"
  ON fleet_members FOR ALL
  USING (auth.role() = 'service_role');

-- ── RLS: AGENT SESSIONS ───────────────────────────────────
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_sessions_super_admin"
  ON agent_sessions FOR ALL
  USING (public.get_my_role() IN ('super_admin','admin'));

CREATE POLICY "agent_sessions_service_all"
  ON agent_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- ── Create Moses's super_admin fleet ─────────────────────
INSERT INTO fleets (name, type, owner_id, description)
SELECT
  'D.A Master Fleet',
  'super_admin',
  'a7a26e70-f360-4c02-9424-a8770374a206',
  'Super admin fleet — all vehicles visible, all commands available'
WHERE NOT EXISTS (
  SELECT 1 FROM fleets WHERE owner_id = 'a7a26e70-f360-4c02-9424-a8770374a206'
);

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE fleets;
ALTER PUBLICATION supabase_realtime ADD TABLE fleet_members;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_sessions;
