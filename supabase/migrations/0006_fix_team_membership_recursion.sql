-- 0005's team-scoped policies checked membership by joining/subquerying
-- team_memberships from *within a policy on team_memberships itself* (and,
-- transitively, from every other policy that joins through it). Postgres
-- has to re-apply team_memberships' own RLS policy to the rows read inside
-- that policy, which requires evaluating the same policy again, forever:
-- "infinite recursion detected in policy for relation team_memberships"
-- (42P17) on any query that touches team_memberships under RLS.
--
-- Fix: security definer helper functions bypass RLS internally (the same
-- trick join_team_by_invite_code already relies on), so checking
-- membership from inside a policy no longer re-triggers that policy.

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

drop policy "team members can view their team" on teams;
drop policy "team admins can update their team" on teams;
drop policy "team members can view memberships in their team" on team_memberships;
drop policy "team admins can update memberships in their team" on team_memberships;
drop policy "team members can view seasons in their team" on seasons;
drop policy "team admins can create seasons" on seasons;
drop policy "team admins can update seasons" on seasons;
drop policy "team members can view season memberships in their team" on season_memberships;
drop policy "team admins can manage season memberships" on season_memberships;
drop policy "activities are visible to their owner or the team once approved" on activities;
drop policy "team admins can view all activities in their team" on activities;
drop policy "team admins can review any activity in their team" on activities;
drop policy "team admins can view any certification photo in their team" on storage.objects;

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
