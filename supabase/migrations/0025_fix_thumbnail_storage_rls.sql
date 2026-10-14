-- 0024에서 activity_photos.thumbnail_storage_path를 추가했는데, 이
-- storage.objects select 정책 두 개(피드 공개 조회/관리자 조회)는
-- 여전히 ap.storage_path(원본)만 확인하고 있어서 본인이 아닌 다른
-- 사람의 썸네일 파일은 아무도 못 보는 버그가 있었다(본인 업로드분은
-- 폴더 소유권 조건으로 우연히 보였을 뿐). 두 정책 다
-- thumbnail_storage_path도 같이 확인하도록 고친다.
alter policy "crew can view their own or approved certification photos" on storage.objects
using (
  bucket_id = 'certifications'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from activity_photos ap
      join activities a on a.id = ap.activity_id
      where (ap.storage_path = storage.objects.name or ap.thumbnail_storage_path = storage.objects.name)
        and a.status = 'approved'
    )
  )
);

alter policy "team admins can view any certification photo in their team" on storage.objects
using (
  bucket_id = 'certifications'
  and exists (
    select 1
    from activity_photos ap
    join activities a on a.id = ap.activity_id
    join seasons s on s.id = a.season_id
    where (ap.storage_path = storage.objects.name or ap.thumbnail_storage_path = storage.objects.name)
      and is_team_admin(s.team_id)
  )
);
