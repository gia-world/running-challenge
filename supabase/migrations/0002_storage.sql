-- Private bucket for certification photos. Kept private (not public) since
-- running-app screenshots often expose a GPS route near the runner's home.
insert into storage.buckets (id, name, public)
values ('certifications', 'certifications', false)
on conflict (id) do nothing;

-- Uploads are stored as "<user_id>/<filename>"; a user may only upload into
-- their own folder.
create policy "crew can upload their own certification photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'certifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Readable by its owner always, and by the whole crew once the matching
-- activity has been approved (mirrors the activities select policy).
create policy "crew can view their own or approved certification photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'certifications'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.activities a
        where a.photo_url = storage.objects.name
          and a.status = 'approved'
      )
    )
  );
