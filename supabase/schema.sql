create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  scope text not null check (scope in ('internal', 'external')),
  icon text,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  type text not null check (type in ('problem', 'idea', 'improvement', 'question')),
  status text not null default 'submitted' check (status in ('submitted', 'trending', 'review', 'implementation', 'done')),
  group_id uuid references public.groups(id),
  user_id uuid references public.profiles(id) on delete set null,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.supports (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid references public.movements(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (movement_id, user_id)
);

create table if not exists public.movement_updates (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid references public.movements(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists movements_set_updated_at on public.movements;
create trigger movements_set_updated_at
before update on public.movements
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.movements enable row level security;
alter table public.supports enable row level security;
alter table public.movement_updates enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "groups_public_read" on public.groups;
create policy "groups_public_read"
on public.groups for select
to anon, authenticated
using (true);

drop policy if exists "movements_public_read" on public.movements;
create policy "movements_public_read"
on public.movements for select
to anon, authenticated
using (true);

drop policy if exists "movements_insert_own" on public.movements;
create policy "movements_insert_own"
on public.movements for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "movements_update_own" on public.movements;
create policy "movements_update_own"
on public.movements for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "movements_delete_own" on public.movements;
create policy "movements_delete_own"
on public.movements for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "supports_public_read" on public.supports;
create policy "supports_public_read"
on public.supports for select
to anon, authenticated
using (true);

drop policy if exists "supports_insert_own" on public.supports;
create policy "supports_insert_own"
on public.supports for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "supports_delete_own" on public.supports;
create policy "supports_delete_own"
on public.supports for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "updates_public_read" on public.movement_updates;
create policy "updates_public_read"
on public.movement_updates for select
to anon, authenticated
using (true);

drop policy if exists "updates_insert_owner" on public.movement_updates;
create policy "updates_insert_owner"
on public.movement_updates for insert
to authenticated
with check (
  exists (
    select 1 from public.movements
    where movements.id = movement_updates.movement_id
    and movements.user_id = auth.uid()
  )
);

create index if not exists movements_group_id_idx on public.movements(group_id);
create index if not exists movements_user_id_idx on public.movements(user_id);
create index if not exists supports_movement_id_idx on public.supports(movement_id);
create index if not exists supports_user_id_idx on public.supports(user_id);
create index if not exists movement_updates_movement_id_idx on public.movement_updates(movement_id);
