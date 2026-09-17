-- Likes on feed activities. Purely social — no bearing on the weekly tally
-- or the review-request flow — added because the re-review request only
-- works if people are actually looking at the feed, and this is the
-- smallest nudge to get them scrolling it.
create table activity_likes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_id, user_id)
);

create index activity_likes_activity_idx on activity_likes (activity_id);

alter table activity_likes enable row level security;

create policy "team members can view likes in their team"
  on activity_likes for select
  to authenticated
  using (
    exists (
      select 1
      from activities a
      join seasons s on s.id = a.season_id
      where a.id = activity_likes.activity_id
        and is_team_member(s.team_id)
    )
  );

create policy "team members can like activities in their team"
  on activity_likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from activities a
      join seasons s on s.id = a.season_id
      where a.id = activity_likes.activity_id
        and is_team_member(s.team_id)
    )
  );

create policy "users can remove their own like"
  on activity_likes for delete
  to authenticated
  using (user_id = auth.uid());
