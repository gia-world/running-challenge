-- 정산이 끝난(settled_at이 채워진) 시즌은 관리자라도 더 이상 컬럼을
-- 수정할 수 없게 막는다. 특히 참가비/환급 단가는 이미 계산·지급된
-- 정산 금액의 근거가 되므로, 정산 후에 바뀌면 실제 지급액과 어긋난다.
-- UI(SeasonFeeForm)에서도 수정 버튼을 숨기지만, API를 직접 호출하는
-- 경로까지 막으려면 RLS에서도 같이 걸어야 한다.
--
-- using에 settled_at is null을 둬서 이미 정산된 행은 애초에 UPDATE
-- 대상으로 선택되지 않게 하고, with check는 is_team_admin(team_id)만
-- 요구해서 "정산 안 됨 -> 정산 완료로 바뀌는" 그 업데이트(SettleSeasonButton)
-- 자체는 계속 허용한다.
drop policy "team admins can update seasons" on seasons;

create policy "team admins can update seasons"
  on seasons for update
  to authenticated
  using (is_team_admin(team_id) and settled_at is null)
  with check (is_team_admin(team_id));
