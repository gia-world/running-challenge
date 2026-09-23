-- The account a team's admin collects money into — specifically the "벌금"
-- (unpaid, non-carried-over portion of a renewing participant's entry fee)
-- shown on the personal season report. Distinct from profiles.bank_*
-- (each person's own account, which is where THEIR refund/prize goes).
--
-- No new RLS needed: "team members can view their team" (any member,
-- select) and "team admins can update their team" (admin only, update)
-- from 0005 already cover these two columns like every other teams column.
alter table teams add column settlement_bank_name text;
alter table teams add column settlement_account_number text;
