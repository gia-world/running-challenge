-- Participation fee / refund / prize settlement — calculation only. Actual
-- money movement stays manual (담당자가 은행 앱으로 직접 송금): becoming an
-- approved 오픈뱅킹 이용기관 through 금융결제원 to automate real transfers is
-- out of reach for a side project, so this just computes who gets how much.
--
-- entry_fee / refund_per_certification live on the season (set once, at
-- creation, by whoever creates it — no separate edit flow) rather than on
-- the team, since different seasons of the same team can charge different
-- amounts. Both nullable: a season created before this feature (or one a
-- team chooses not to charge for) simply has no settlement to show.
alter table seasons
  add column entry_fee numeric(10, 0),
  add column refund_per_certification numeric(10, 0);

-- Bank details a member registers once for themselves, so whoever is doing
-- the manual transfer never has to ask each person's account number.
-- Covered by the existing "a user can update their own profile" policy
-- (id = auth.uid()) — no new RLS needed for these columns.
alter table profiles
  add column bank_name text,
  add column bank_account_number text;
