-- v0 schema: profiles + activities (manual certification upload & review)
-- Weekly progress is computed on read from approved activities; no separate
-- "Week" table is needed since it's fully derived from Activity + a Monday-start rule.

create type user_role as enum ('crew', 'admin');
create type activity_status as enum ('pending', 'approved', 'rejected');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role user_role not null default 'crew',
  created_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  activity_date date not null,
  distance_km numeric(5, 2) not null check (distance_km >= 5),
  photo_url text not null,
  status activity_status not null default 'pending',
  rejected_reason text,
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 하루 최대 1회 인증: only one non-rejected certification per user per day.
-- Rejected records don't count, so a crew member can resubmit for the same day.
create unique index activities_one_per_day
  on activities (user_id, activity_date)
  where status <> 'rejected';

create index activities_user_date_idx on activities (user_id, activity_date desc);
create index activities_status_idx on activities (status);

-- Auto-create a profile row from Kakao OAuth metadata on first sign-in.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      '러너'
    ),
    'crew'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;
alter table activities enable row level security;

create policy "profiles are readable by any signed-in crew member"
  on profiles for select
  to authenticated
  using (true);

create policy "a user can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid());

create policy "approved activities are visible to the whole crew (feed)"
  on activities for select
  to authenticated
  using (status = 'approved' or user_id = auth.uid());

create policy "a user can submit their own certification"
  on activities for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "admins can review any activity"
  on activities for update
  to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'
  ));
