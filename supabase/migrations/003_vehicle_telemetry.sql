create table if not exists vehicle_telemetry (
  id          uuid default gen_random_uuid() primary key,
  vehicle_id  uuid references vehicles(id) on delete cascade not null,
  latitude    double precision not null,
  longitude   double precision not null,
  speed       numeric(6,2),
  heading     numeric(5,2),
  accuracy    numeric(6,2),
  altitude    numeric(8,2),
  recorded_at timestamptz not null default now(),
  session_id  uuid
);

create index if not exists idx_vehicle_telemetry_vehicle_recorded
  on vehicle_telemetry (vehicle_id, recorded_at desc);

alter table vehicle_telemetry enable row level security;

drop policy if exists "driver inserts own telemetry" on vehicle_telemetry;
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

drop policy if exists "authenticated read telemetry" on vehicle_telemetry;
create policy "authenticated read telemetry"
  on vehicle_telemetry for select
  using (auth.role() = 'authenticated');

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

drop trigger if exists trg_vehicle_last_seen on vehicle_telemetry;
create trigger trg_vehicle_last_seen
  after insert on vehicle_telemetry
  for each row execute function update_vehicle_last_seen();
