create table if not exists public.movement_reactions (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid references public.movements(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('dislike')),
  created_at timestamptz default now(),
  unique (movement_id, user_id, reaction_type)
);

alter table public.movement_reactions enable row level security;

drop policy if exists reactions_read_for_visible_movements on public.movement_reactions;
create policy reactions_read_for_visible_movements on public.movement_reactions
for select to anon, authenticated
using (
  exists (
    select 1 from public.movements m
    where m.id = movement_reactions.movement_id
    and (m.scope = 'external' or public.is_admin() or public.can_read_group(m.group_id))
  )
);

drop policy if exists reactions_insert_own on public.movement_reactions;
create policy reactions_insert_own on public.movement_reactions
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists reactions_delete_own on public.movement_reactions;
create policy reactions_delete_own on public.movement_reactions
for delete to authenticated
using (user_id = auth.uid());

create index if not exists movement_reactions_movement_id_idx on public.movement_reactions(movement_id);
create index if not exists movement_reactions_user_id_idx on public.movement_reactions(user_id);

grant select on public.movement_reactions to anon, authenticated;
grant insert, delete on public.movement_reactions to authenticated;
