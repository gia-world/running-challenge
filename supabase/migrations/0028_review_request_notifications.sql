-- 재인증 요청이 들어오면 관리자들에게도 인앱 알림이 뜨게 한다 — 지금까지는
-- 카카오 메시지만 가고 notifications 테이블에는 안 남아서, 입장 팝업/알림
-- 벨 어디에도 안 잡혔다.
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('comment', 'reply', 'reaction', 'review_request'));

create or replace function public.notify_on_review_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_admin record;
begin
  select s.team_id into v_team_id
  from activities a
  join seasons s on s.id = a.season_id
  where a.id = new.activity_id;

  if v_team_id is null then
    return new;
  end if;

  for v_admin in
    select user_id from team_memberships where team_id = v_team_id and role = 'admin'
  loop
    if v_admin.user_id <> new.requested_by then
      insert into notifications (user_id, actor_user_id, type, activity_id)
      values (v_admin.user_id, new.requested_by, 'review_request', new.activity_id);
    end if;
  end loop;

  return new;
end;
$$;

create trigger on_review_request_created
  after insert on activity_review_requests
  for each row execute procedure public.notify_on_review_request();
