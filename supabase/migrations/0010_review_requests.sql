-- Review model change: uploads are now auto-approved immediately (no admin
-- pre-review queue). Instead, any team member who spots a suspicious
-- certification in the feed can request a re-review; admins only look at
-- the activities someone actually flagged, and either keep them approved
-- or reject them (existing activities.status/rejected_reason flow, unchanged).
--
-- This is app-level for the auto-approve part (CertifyForm just inserts
-- status: 'approved' now instead of 'pending' — no schema change needed
-- for that), and this migration only adds the flagging mechanism itself.
create table activity_review_requests (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities (id) on delete cascade,
  requested_by uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles (id)
);

-- One active (pending) request per person per activity — they can still
-- request again later if a previous request of theirs was already resolved.
create unique index activity_review_requests_one_pending_per_requester
  on activity_review_requests (activity_id, requested_by)
  where status = 'pending';

create index activity_review_requests_activity_idx on activity_review_requests (activity_id);
create index activity_review_requests_status_idx on activity_review_requests (status);

alter table activity_review_requests enable row level security;

-- Team members need to see these both to render the feed's "요청됨" state
-- and (for admins) the review-request queue. Not exposing this more widely
-- than "your team" mirrors every other team-scoped table here.
create policy "team members can view review requests in their team"
  on activity_review_requests for select
  to authenticated
  using (
    exists (
      select 1
      from activities a
      join seasons s on s.id = a.season_id
      where a.id = activity_review_requests.activity_id
        and is_team_member(s.team_id)
    )
  );

-- Anyone on the team can flag an approved activity that isn't their own.
create policy "team members can request re-review of approved activities"
  on activity_review_requests for insert
  to authenticated
  with check (
    requested_by = auth.uid()
    and exists (
      select 1
      from activities a
      join seasons s on s.id = a.season_id
      where a.id = activity_review_requests.activity_id
        and a.status = 'approved'
        and a.user_id <> auth.uid()
        and is_team_member(s.team_id)
    )
  );

-- Letting the requester withdraw their own still-pending request (e.g. a
-- misclick) — a delete rather than an update since there's nothing else to
-- change on a row that's simply being retracted.
create policy "requesters can withdraw their own pending request"
  on activity_review_requests for delete
  to authenticated
  using (requested_by = auth.uid() and status = 'pending');

-- Only admins resolve requests (keep-approved or reject flows both update
-- the request's status here; the corresponding activities.status change
-- goes through the existing "team admins can review any activity" policy).
create policy "team admins can resolve review requests"
  on activity_review_requests for update
  to authenticated
  using (
    exists (
      select 1
      from activities a
      join seasons s on s.id = a.season_id
      where a.id = activity_review_requests.activity_id
        and is_team_admin(s.team_id)
    )
  )
  with check (
    exists (
      select 1
      from activities a
      join seasons s on s.id = a.season_id
      where a.id = activity_review_requests.activity_id
        and is_team_admin(s.team_id)
    )
  );
