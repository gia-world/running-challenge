-- Admins need to see pending/rejected activities and photos that belong to
-- other crew members in order to review them (the existing select policies
-- only expose approved rows, or a user's own). Postgres OR's multiple
-- permissive policies together, so these are additive.

create policy "admins can view all activities"
  on activities for select
  to authenticated
  using (exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create policy "admins can view any certification photo"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'certifications'
    and exists (
      select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
