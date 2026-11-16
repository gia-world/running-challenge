-- 관리자가 작성하는 팀 전체 공지사항 — "댓글 기능이 추가됐어요" 같은
-- 안내를 입장 팝업에서 한 번 보여주기 위함. 개인 알림(notifications)과는
-- 별개 — 이쪽은 누가 읽었는지 건별로 추적하지 않고, profiles에 "마지막으로
-- 공지를 확인한 시각"만 저장해서 그보다 최신인 공지만 안읽은 것으로 본다.
create table announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  created_by uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index announcements_team_idx on announcements (team_id, created_at desc);

alter table announcements enable row level security;

create policy "team members can view announcements in their team"
  on announcements for select
  to authenticated
  using (is_team_member(team_id));

create policy "team admins can create announcements"
  on announcements for insert
  to authenticated
  with check (is_team_admin(team_id) and created_by = auth.uid());

create policy "team admins can delete announcements"
  on announcements for delete
  to authenticated
  using (is_team_admin(team_id));

alter table profiles add column last_seen_announcement_at timestamptz;
