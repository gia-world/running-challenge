-- Rule change: daily duplicate certification is blocked outright again
-- (0005 had relaxed this to "allowed but doesn't count towards the weekly
-- tally"). Extra certifications on OTHER days beyond the weekly goal are
-- still fine and still count — this constraint is per (user, day) only.
--
-- Some crews may already have same-day duplicates from while that was
-- allowed, which would make the unique index below fail to create. Resolve
-- them first: keep the earliest submission per (user, day), auto-reject
-- the rest (they stay as a record, just no longer "active").
with duplicates as (
  select
    id,
    row_number() over (
      partition by user_id, activity_date
      order by created_at asc
    ) as rn
  from activities
  where status <> 'rejected'
)
update activities
set status = 'rejected',
    rejected_reason = '하루 1건 제한 규칙 적용 전 중복 제출 - 자동 반려'
where id in (select id from duplicates where rn > 1);

create unique index activities_one_per_day
  on activities (user_id, activity_date)
  where status <> 'rejected';
