-- Lets /login and /join show the actual team name for a ?code= link before
-- the visitor has signed in (or, on /join, before they've actually joined) —
-- previously there was no way to look anything up by invite_code without
-- being authenticated, since join_team_by_invite_code is authenticated-only.
--
-- security definer for the same reason as join_team_by_invite_code: the
-- invite_code column itself never needs a broad SELECT policy. This only
-- ever returns the team's own display name, nothing else, so it doesn't
-- meaningfully add to what an invite code already lets someone do (join the
-- team and see that same name).
create or replace function public.get_team_name_by_invite_code(p_code text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select name from teams where invite_code = p_code;
$$;

grant execute on function public.get_team_name_by_invite_code(text) to anon, authenticated;
