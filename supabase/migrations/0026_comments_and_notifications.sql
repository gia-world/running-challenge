-- 댓글 + 대댓글(1단계만 — parent_comment_id가 최상위 댓글을 가리킴)과,
-- 인앱 알림(카톡 메시지는 보내지 않고 앱 안에서만 확인) 스키마.
create table activity_comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  parent_comment_id uuid references activity_comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index activity_comments_activity_idx on activity_comments (activity_id);
create index activity_comments_parent_idx on activity_comments (parent_comment_id);

alter table activity_comments enable row level security;

create policy "team members can view comments in their team"
  on activity_comments for select
  to authenticated
  using (
    exists (
      select 1
      from activities a
      join seasons s on s.id = a.season_id
      where a.id = activity_comments.activity_id
        and is_team_member(s.team_id)
    )
  );

create policy "team members can comment on activities in their team"
  on activity_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from activities a
      join seasons s on s.id = a.season_id
      where a.id = activity_comments.activity_id
        and is_team_member(s.team_id)
    )
  );

create policy "users can delete their own comment"
  on activity_comments for delete
  to authenticated
  using (user_id = auth.uid());

-- 수신자(user_id) 본인만 조회/읽음 처리 가능. insert 정책은 일부러 두지
-- 않는다 — 생성은 아래 security definer 트리거로만 하게 해서, 클라이언트가
-- 직접 남의 알림함에 뭔가 꽂는 경로 자체를 막는다.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  actor_user_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in ('comment', 'reply', 'reaction')),
  activity_id uuid not null references activities (id) on delete cascade,
  comment_id uuid references activity_comments (id) on delete cascade,
  emoji text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);

alter table notifications enable row level security;

create policy "users can view their own notifications"
  on notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can mark their own notifications read"
  on notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 댓글이 달리면: 대댓글(parent_comment_id 있음)이면 그 상위 댓글 작성자에게,
-- 아니면 인증 사진 주인에게 알림 — 본인 글/댓글에 본인이 단 경우는 제외.
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_type text;
begin
  if new.parent_comment_id is not null then
    select user_id into v_recipient from activity_comments where id = new.parent_comment_id;
    v_type := 'reply';
  else
    select user_id into v_recipient from activities where id = new.activity_id;
    v_type := 'comment';
  end if;

  if v_recipient is not null and v_recipient <> new.user_id then
    insert into notifications (user_id, actor_user_id, type, activity_id, comment_id)
    values (v_recipient, new.user_id, v_type, new.activity_id, new.id);
  end if;

  return new;
end;
$$;

create trigger on_comment_created
  after insert on activity_comments
  for each row execute procedure public.notify_on_comment();

-- 이모지 리액션이 달리면 인증 사진 주인에게 알림 — 본인이 자기 글에 누른
-- 건 제외.
create or replace function public.notify_on_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  select user_id into v_recipient from activities where id = new.activity_id;

  if v_recipient is not null and v_recipient <> new.user_id then
    insert into notifications (user_id, actor_user_id, type, activity_id, emoji)
    values (v_recipient, new.user_id, 'reaction', new.activity_id, new.emoji);
  end if;

  return new;
end;
$$;

create trigger on_reaction_created
  after insert on activity_reactions
  for each row execute procedure public.notify_on_reaction();
