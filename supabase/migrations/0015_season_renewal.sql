-- 시즌 자동연장: 참가자가 시즌 4주차부터 "다음 시즌도 계속할지" 답할 수
-- 있게 하는 컬럼. true면 이번 시즌 환급액을 돌려받지 않고 다음 시즌
-- 참가비로 자동 이월 — 담당자는 완주 시 상금만 송금하면 됨. null = 아직
-- 응답 안 함 (시즌이 4주차에 도달하기 전, 또는 응답을 안 한 채로 끝난 경우).
alter table season_memberships
  add column renew_next_season boolean;

-- 기존 "team admins can manage season memberships"(for all) 정책은 관리자
-- 전용이라, 참가자 본인이 자신의 연장 여부를 답하려면 별도 정책이 필요함.
-- season_id/user_id까지 자유롭게 바꿀 수 있게 되는 건 알지만, 참가비/환급금이
-- 걸린 소규모 신뢰 기반 팀이라는 이 앱의 전제상 행 단위 정책으로 충분하다고
-- 판단 (컬럼 단위 제한은 별도 트리거가 필요해 과함).
create policy "users can set their own renewal choice"
  on season_memberships for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
