-- Stores each user's Kakao OAuth refresh token so the backend can later
-- send a KakaoTalk "나에게 보내기" notification (new re-review request for
-- team admins, activity rejected for the activity's owner) without the
-- user being present in a browser session at notification time.
--
-- Refresh tokens are only ever written by the token's own owner right
-- after Kakao OAuth (auth/callback captures provider_refresh_token via an
-- upsert). A select policy on one's own row is required for that upsert
-- to see an existing row to update (Postgres RLS needs row visibility for
-- UPDATE, not just the UPDATE policy's USING clause) — self-reading your
-- own token isn't a real exposure since it's the same credential the
-- client already held when it was first captured. What matters is that no
-- OTHER user's row is selectable, insertable, or updatable through the
-- client; only server-side code running as service_role (the notification
-- sender) can read across all rows.
create table kakao_tokens (
  user_id uuid primary key references profiles (id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table kakao_tokens enable row level security;

create policy "users can view their own kakao refresh token"
  on kakao_tokens for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can store their own kakao refresh token"
  on kakao_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can update their own kakao refresh token"
  on kakao_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
