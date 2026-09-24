-- 그레이스 기간이 끝났는데 처리할 재인증/중도하차 요청이 남아있어서
-- 자동 정산을 못 했을 때, 관리자에게 카톡 알림을 보낸 시점을 기록.
-- null이면 아직 알림을 보낸 적 없음 — 값이 채워지면 같은 시즌에는
-- 요청이 남아있는 동안 다시 알림을 보내지 않는다(스팸 방지, 한 번만).
--
-- "team admins can update seasons" 정책이 이미 관리자의 시즌 컬럼 전체
-- 수정(settled_at이 null인 동안)을 허용하므로 별도 RLS 정책은 필요 없음.
alter table seasons
  add column settlement_notified_at timestamptz;
