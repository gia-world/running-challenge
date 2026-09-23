-- Mid-season withdrawal: a participant can request to drop out of a season
-- with a reason. Dropout settlement doesn't fit the normal per-certification
-- formula (they may stop certifying partway through a week), so an admin
-- decides both whether to approve it and what to settle, rather than the
-- app computing it. Mirrors activity_review_requests' request/resolve shape.
create table season_dropout_requests (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  settlement_amount numeric,
  admin_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references profiles (id)
);

-- One active (pending) request per person per season — mirrors
-- activity_review_requests_one_pending_per_requester.
create unique index season_dropout_requests_one_pending_per_user
  on season_dropout_requests (season_id, user_id)
  where status = 'pending';

create index season_dropout_requests_season_idx on season_dropout_requests (season_id);
create index season_dropout_requests_status_idx on season_dropout_requests (status);

alter table season_dropout_requests enable row level security;

create policy "team members can view dropout requests in their team"
  on season_dropout_requests for select
  to authenticated
  using (
    exists (
      select 1 from seasons s
      where s.id = season_dropout_requests.season_id
        and is_team_member(s.team_id)
    )
  );

-- Only an active participant of the (still open) season can request their
-- own dropout.
create policy "season members can request their own dropout"
  on season_dropout_requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from season_memberships sm
      join seasons s on s.id = sm.season_id
      where sm.season_id = season_dropout_requests.season_id
        and sm.user_id = auth.uid()
        and s.settled_at is null
    )
  );

-- Withdraw their own still-pending request (e.g. a misclick), same pattern
-- as activity_review_requests.
create policy "requesters can withdraw their own pending request"
  on season_dropout_requests for delete
  to authenticated
  using (user_id = auth.uid() and status = 'pending');

create policy "team admins can resolve dropout requests"
  on season_dropout_requests for update
  to authenticated
  using (
    exists (
      select 1 from seasons s
      where s.id = season_dropout_requests.season_id
        and is_team_admin(s.team_id)
    )
  )
  with check (
    exists (
      select 1 from seasons s
      where s.id = season_dropout_requests.season_id
        and is_team_admin(s.team_id)
    )
  );
