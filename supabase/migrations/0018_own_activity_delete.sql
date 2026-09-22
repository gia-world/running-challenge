-- 피드에서 본인이 올린 인증을 스스로 삭제할 수 있게 한다. activities에는
-- DELETE 정책이 아예 없었으므로 RLS가 기본적으로 모든 삭제를 막고 있었다.
--
-- 정산이 끝난(seasons.settled_at이 채워진) 시즌의 인증은 삭제를 막는다 —
-- 이미 그 인증 횟수를 근거로 환급/상금이 계산·지급됐으므로, 정산 후에
-- 지워지면 실제 지급액과 기록이 어긋난다. 0017과 같은 이유.
create policy "a user can delete their own unsettled activity"
  on activities for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from seasons s
      where s.id = activities.season_id
        and s.settled_at is null
    )
  );

-- 인증 삭제 시 storage에 남은 인증샷 파일도 같이 지울 수 있어야 한다.
-- storage.objects에도 DELETE 정책이 없어서 본인 폴더(auth.uid()/...)
-- 파일조차 지울 수 없었다 — 업로드(INSERT) 정책과 동일한 조건으로 추가.
create policy "crew can delete their own certification photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'certifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
