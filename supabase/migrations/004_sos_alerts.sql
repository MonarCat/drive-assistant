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

drop policy if exists "driver inserts own sos" on sos_alerts;
create policy "driver inserts own sos"
  on sos_alerts for insert
  with check (auth.uid() = user_id);

drop policy if exists "authenticated reads sos" on sos_alerts;
create policy "authenticated reads sos"
  on sos_alerts for select
  using (auth.role() = 'authenticated');
