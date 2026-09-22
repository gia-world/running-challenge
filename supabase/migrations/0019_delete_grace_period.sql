-- 0018은 "정산 완료 전"이면 삭제를 허용했는데, 시즌이 끝났지만 아직
-- 관리자가 정산완료를 안 눌렀을 수도 있는 기간(길게는 며칠~몇 주)까지
-- 삭제가 열려 있었다. 인증 자체를 더 이상 넣을 수 없는 시점(그레이스
-- 기간 종료)부터는 지우는 것도 막아서, "인증할 수 있는 기간 = 지울 수
-- 있는 기간"으로 좁힌다. 정산은 그보다 한참 뒤에 일어나므로 이 조건이
-- 기존 settled_at is null보다 항상 더 이르게(엄격하게) 막는다.
--
-- 그레이스 기간 계산은 src/lib/week.ts의 isWithinCertificationGrace와
-- 정확히 같은 규칙: 종료일 이전이거나, 종료 다음날 정오 전까지.
create or replace function public.is_within_certification_grace(p_season_end_date date) returns boolean
language sql
stable
as $$
  select
    (now() at time zone 'Asia/Seoul')::date <= p_season_end_date
    or (
      (now() at time zone 'Asia/Seoul')::date = p_season_end_date + 1
      and extract(hour from (now() at time zone 'Asia/Seoul')) < 12
    );
$$;

drop policy "a user can delete their own unsettled activity" on activities;

create policy "a user can delete their own activity during its grace period"
  on activities for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from seasons s
      where s.id = activities.season_id
        and is_within_certification_grace(s.end_date)
    )
  );
