-- Two follow-ups to season_dropout_requests (0021):
--
-- 1. An admin can now remove a participant directly (via ParticipantToggle's
--    "참여 취소") without them ever filing a request. That removal should go
--    through the same admin-decides-settlement step an approved request
--    gets, recorded as a season_dropout_requests row the admin creates
--    themselves — so `reason` (previously always filled in by the
--    requesting member) is no longer guaranteed to have one.
-- 2. That means admins need an insert path of their own, not just the
--    existing "for their own dropout" one (which requires user_id = auth.uid()).

alter table season_dropout_requests alter column reason drop not null;

create policy "team admins can create dropout requests for their team"
  on season_dropout_requests for insert
  to authenticated
  with check (
    exists (
      select 1 from seasons s
      where s.id = season_dropout_requests.season_id
        and is_team_admin(s.team_id)
    )
  );
