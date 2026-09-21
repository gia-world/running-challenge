-- 시즌 정산 완료 시점을 기록. null이면 아직 정산 전 — 시즌 날짜가 끝났는지
-- 여부와 조합해서 화면에서 진행중/정산중/시즌 종료 세 단계로 나눠 보여줌.
-- 정산 완료 후에는 참여자 변경, 재인증 요청 신청/처리가 모두 막힘.
--
-- 기존 "team admins can update seasons" 정책이 이미 관리자의 시즌 컬럼
-- 전체 수정을 허용하므로 별도 RLS 정책은 필요 없음.
alter table seasons
  add column settled_at timestamptz;
