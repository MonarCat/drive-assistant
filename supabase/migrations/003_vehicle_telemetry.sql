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

alter table if exists public.vehicle_telemetry
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists recorded_at timestamptz;

do $fix_cols_1$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicle_telemetry'
      and column_name = 'lat'
  ) then
    execute 'update public.vehicle_telemetry
             set latitude = lat
             where latitude is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicle_telemetry'
      and column_name = 'lng'
  ) then
    execute 'update public.vehicle_telemetry
             set longitude = lng
             where longitude is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicle_telemetry'
      and column_name = 'last_seen'
  ) then
    execute 'update public.vehicle_telemetry
             set recorded_at = last_seen
             where recorded_at is null';
  end if;
end;
$fix_cols_1$;

do $fix_cols_2$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicle_telemetry'
      and column_name = 'created_at'
  ) then
    execute 'update public.vehicle_telemetry
             set recorded_at = created_at
             where recorded_at is null';
  end if;
end;
$fix_cols_2$;

update public.vehicle_telemetry
set recorded_at = now()
where recorded_at is null;

do $set_default_recorded_at$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicle_telemetry'
      and column_name = 'recorded_at'
  ) then
    execute 'alter table public.vehicle_telemetry
             alter column recorded_at set default now()';
  end if;
end;
$set_default_recorded_at$;

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

do $update_fn$
declare
  has_vehicle_latitude boolean;
  has_vehicle_longitude boolean;
  has_vehicle_lat boolean;
  has_vehicle_lng boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'latitude'
  ) into has_vehicle_latitude;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'longitude'
  ) into has_vehicle_longitude;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'lat'
  ) into has_vehicle_lat;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'lng'
  ) into has_vehicle_lng;

  if has_vehicle_latitude and has_vehicle_longitude then
    execute $sql$
      create or replace function update_vehicle_last_seen()
      returns trigger
      language plpgsql as $fnbody$
      begin
        update vehicles
        set last_seen = new.recorded_at,
            latitude  = new.latitude,
            longitude = new.longitude,
            speed     = new.speed
        where id = new.vehicle_id;
        return new;
      end;
      $fnbody$;
    $sql$;

  elsif has_vehicle_lat and has_vehicle_lng then
    execute $sql$
      create or replace function update_vehicle_last_seen()
      returns trigger
      language plpgsql as $fnbody$
      begin
        update vehicles
        set last_seen = new.recorded_at,
            lat   = new.latitude,
            lng   = new.longitude,
            speed = new.speed
        where id = new.vehicle_id;
        return new;
      end;
      $fnbody$;
    $sql$;

  elsif has_vehicle_latitude and has_vehicle_lng then
    execute $sql$
      create or replace function update_vehicle_last_seen()
      returns trigger
      language plpgsql as $fnbody$
      begin
        update vehicles
        set last_seen = new.recorded_at,
            latitude = new.latitude,
            lng      = new.longitude,
            speed    = new.speed
        where id = new.vehicle_id;
        return new;
      end;
      $fnbody$;
    $sql$;

  elsif has_vehicle_lat and has_vehicle_longitude then
    execute $sql$
      create or replace function update_vehicle_last_seen()
      returns trigger
      language plpgsql as $fnbody$
      begin
        update vehicles
        set last_seen = new.recorded_at,
            lat       = new.latitude,
            longitude = new.longitude,
            speed     = new.speed
        where id = new.vehicle_id;
        return new;
      end;
      $fnbody$;
    $sql$;

  else
    execute $sql$
      create or replace function update_vehicle_last_seen()
      returns trigger
      language plpgsql as $fnbody$
      begin
        update vehicles
        set last_seen = new.recorded_at,
            speed     = new.speed
        where id = new.vehicle_id;
        return new;
      end;
      $fnbody$;
    $sql$;
  end if;
end;
$update_fn$;

drop trigger if exists trg_vehicle_last_seen on vehicle_telemetry;
create trigger trg_vehicle_last_seen
  after insert on vehicle_telemetry
  for each row execute function update_vehicle_last_seen();
