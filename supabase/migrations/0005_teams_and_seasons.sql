-- v0.2: Team / Season structure per the updated plan doc.
--
-- - Team: v0 seeds exactly one, with an invite code crew members join by.
-- - Role moves from profiles (global) to team_memberships (per-team).
-- - Season: a team's 4-week cert window; admin creates it, crew must have a
--   SeasonMembership to certify/appear on the board.
-- - Activities move from a single photo_url to a child activity_photos table
--   (multi-photo upload) and gain season_id.
-- - The "one per day" unique index is dropped: multiple uploads/day are now
--   allowed, but only the first non-rejected one counts (enforced at query
--   time via DISTINCT activity_date, not a constraint).

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role user_role not null default 'crew',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table season_memberships (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (season_id, user_id)
);

create index team_memberships_team_idx on team_memberships (team_id);
create index seasons_team_idx on seasons (team_id, start_date desc);
create index season_memberships_season_idx on season_memberships (season_id);

create table activity_photos (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index activity_photos_activity_idx on activity_photos (activity_id, sort_order);

-- ---------------------------------------------------------------------
-- Backfill: seed one team from whatever admin already exists (or a bare
-- team if none), make every existing profile a member, and give existing
-- activities a home season so nothing existing breaks.
-- ---------------------------------------------------------------------

insert into teams (name, invite_code, created_by)
select '러닝 크루', substr(md5(random()::text), 1, 8), id
from profiles
where role = 'admin'
order by created_at asc
limit 1;

insert into teams (name, invite_code)
select '러닝 크루', substr(md5(random()::text), 1, 8)
where not exists (select 1 from teams);

insert into team_memberships (team_id, user_id, role)
select (select id from teams order by created_at asc limit 1), id, role
from profiles
on conflict (team_id, user_id) do nothing;

insert into seasons (team_id, start_date, end_date, created_by)
select
  (select id from teams order by created_at asc limit 1),
  coalesce((select min(activity_date) from activities), current_date),
  coalesce((select max(activity_date) from activities), current_date) + 1,
  (select created_by from teams order by created_at asc limit 1)
where exists (select 1 from activities);

alter table activities add column season_id uuid references seasons (id);

update activities
set season_id = (select id from seasons order by created_at asc limit 1)
where season_id is null;

alter table activities alter column season_id set not null;

insert into activity_photos (activity_id, storage_path, sort_order)
select id, photo_url, 0 from activities where photo_url is not null;

-- ---------------------------------------------------------------------
-- Shape changes to activities/profiles now that the backfill above has run.
-- ---------------------------------------------------------------------

drop index if exists activities_one_per_day;

drop policy "crew can view their own or approved certification photos" on storage.objects;
drop policy "admins can view any certification photo" on storage.objects;
drop policy "admins can view all activities" on activities;
drop policy "admins can review any activity" on activities;
drop policy "approved activities are visible to the whole crew (feed)" on activities;

alter table activities drop column photo_url;
alter table profiles drop column role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      '러너'
    )
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Join-by-invite-code: security definer so the invite_code column itself
-- never needs a broad SELECT policy (it's a write-only credential).
-- ---------------------------------------------------------------------

create or replace function public.join_team_by_invite_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  select id into v_team_id from teams where invite_code = p_code;

  if v_team_id is null then
    raise exception 'invalid_invite_code';
  end if;

  insert into team_memberships (team_id, user_id, role)
  values (v_team_id, auth.uid(), 'crew')
  on conflict (team_id, user_id) do nothing;

  return v_team_id;
end;
$$;

grant execute on function public.join_team_by_invite_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table teams enable row level security;
alter table team_memberships enable row level security;
alter table seasons enable row level security;
alter table season_memberships enable row level security;
alter table activity_photos enable row level security;

-- security definer so checking membership from inside a policy never
-- re-triggers that same policy (a plain subquery against team_memberships
-- from within team_memberships' own policy causes "infinite recursion
-- detected in policy for relation team_memberships", 42P17, and the same
-- for anything that joins through it).
create or replace function public.is_team_member(p_team_id uuid) returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from team_memberships
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(p_team_id uuid) returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from team_memberships
    where team_id = p_team_id and user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_admin(uuid) to authenticated;

create policy "team members can view their team"
  on teams for select
  to authenticated
  using (is_team_member(id));

create policy "team admins can update their team"
  on teams for update
  to authenticated
  using (is_team_admin(id));

create policy "team members can view memberships in their team"
  on team_memberships for select
  to authenticated
  using (is_team_member(team_id));

create policy "team admins can update memberships in their team"
  on team_memberships for update
  to authenticated
  using (is_team_admin(team_id));

create policy "team members can view seasons in their team"
  on seasons for select
  to authenticated
  using (is_team_member(team_id));

create policy "team admins can create seasons"
  on seasons for insert
  to authenticated
  with check (is_team_admin(team_id));

create policy "team admins can update seasons"
  on seasons for update
  to authenticated
  using (is_team_admin(team_id));

create policy "team members can view season memberships in their team"
  on season_memberships for select
  to authenticated
  using (exists (
    select 1 from seasons s
    where s.id = season_memberships.season_id and is_team_member(s.team_id)
  ));

create policy "team admins can manage season memberships"
  on season_memberships for all
  to authenticated
  using (exists (
    select 1 from seasons s
    where s.id = season_memberships.season_id and is_team_admin(s.team_id)
  ))
  with check (exists (
    select 1 from seasons s
    where s.id = season_memberships.season_id and is_team_admin(s.team_id)
  ));

create policy "activities are visible to their owner or the team once approved"
  on activities for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      status = 'approved'
      and exists (
        select 1 from seasons s where s.id = activities.season_id and is_team_member(s.team_id)
      )
    )
  );

create policy "team admins can view all activities in their team"
  on activities for select
  to authenticated
  using (exists (
    select 1 from seasons s where s.id = activities.season_id and is_team_admin(s.team_id)
  ));

create policy "team admins can review any activity in their team"
  on activities for update
  to authenticated
  using (exists (
    select 1 from seasons s where s.id = activities.season_id and is_team_admin(s.team_id)
  ));

create policy "activity photos follow their activity's visibility"
  on activity_photos for select
  to authenticated
  using (exists (
    select 1 from activities a where a.id = activity_photos.activity_id
  ));

create policy "a user can add photos to their own activity"
  on activity_photos for insert
  to authenticated
  with check (exists (
    select 1 from activities a
    where a.id = activity_photos.activity_id and a.user_id = auth.uid()
  ));

create policy "crew can view their own or approved certification photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'certifications'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from activity_photos ap
        join activities a on a.id = ap.activity_id
        where ap.storage_path = storage.objects.name and a.status = 'approved'
      )
    )
  );

create policy "team admins can view any certification photo in their team"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'certifications'
    and exists (
      select 1
      from activity_photos ap
      join activities a on a.id = ap.activity_id
      join seasons s on s.id = a.season_id
      where ap.storage_path = storage.objects.name and is_team_admin(s.team_id)
    )
  );
