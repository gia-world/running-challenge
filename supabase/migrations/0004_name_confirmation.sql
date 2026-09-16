-- Kakao nicknames aren't always real names. New (and existing) crew members
-- must confirm/correct their display name once before using the app.
alter table profiles add column name_confirmed boolean not null default false;
