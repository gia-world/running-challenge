-- Terminology cleanup: the app's own wording had drifted between "크루원"
-- and "팀원" for the same thing, so the code and DB should agree on plain
-- admin/user instead of admin/crew.
--
-- ALTER TYPE ... RENAME VALUE only relabels the existing enum value (it
-- keeps the same internal OID), so every existing row and every column
-- DEFAULT bound to this type updates automatically — no backfill needed.
-- The one thing that does need updating is join_team_by_invite_code's
-- function body: unlike a column DEFAULT, the literal 'crew' inside a
-- PL/pgSQL function is re-parsed against the enum on every call, so it
-- would start failing with "invalid input value for enum user_role" the
-- moment the label no longer exists.
alter type user_role rename value 'crew' to 'user';

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
  values (v_team_id, auth.uid(), 'user')
  on conflict (team_id, user_id) do nothing;

  return v_team_id;
end;
$$;
