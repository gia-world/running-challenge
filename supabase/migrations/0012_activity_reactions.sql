-- Replaces the single like button with a richer emoji reaction set. Same
-- purpose as activity_likes (drive feed engagement so the re-review flagging
-- mechanism actually gets seen), but a teammate can leave several different
-- reactions on the same activity instead of one boolean like — the unique
-- constraint only blocks leaving the *same* emoji twice.
create table activity_reactions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '👍', '🔥', '💪', '🎉', '👏', '🎶', '😢', '🤣', '🫢')),
  created_at timestamptz not null default now(),
  unique (activity_id, user_id, emoji)
);

create index activity_reactions_activity_idx on activity_reactions (activity_id);

alter table activity_reactions enable row level security;

create policy "team members can view reactions in their team"
  on activity_reactions for select
  to authenticated
  using (
    exists (
      select 1
      from activities a
      join seasons s on s.id = a.season_id
      where a.id = activity_reactions.activity_id
        and is_team_member(s.team_id)
    )
  );

create policy "team members can react to activities in their team"
  on activity_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from activities a
      join seasons s on s.id = a.season_id
      where a.id = activity_reactions.activity_id
        and is_team_member(s.team_id)
    )
  );

create policy "users can remove their own reaction"
  on activity_reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- Carry over existing likes as ❤️ reactions before retiring that table.
insert into activity_reactions (activity_id, user_id, emoji, created_at)
select activity_id, user_id, '❤️', created_at
from activity_likes
on conflict (activity_id, user_id, emoji) do nothing;

drop table activity_likes;
