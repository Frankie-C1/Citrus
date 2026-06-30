create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text unique,
  display_name text,
  avatar_url text,
  role text default 'user',
  has_seen_conduct_notice boolean default false,
  deleted_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists email text unique;
alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists has_seen_conduct_notice boolean default false;
alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.profiles add column if not exists deletion_requested_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

update public.profiles
set username = coalesce(username, 'user_' || substr(replace(id::text, '-', ''), 1, 8)),
    display_name = coalesce(display_name, username, split_part(coalesce(email, 'citrus'), '@', 1)),
    role = coalesce(role, 'user'),
    has_seen_conduct_notice = coalesce(has_seen_conduct_notice, false)
where username is null or role is null or has_seen_conduct_notice is null;

alter table public.profiles alter column username set not null;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin')) not valid;
alter table public.profiles validate constraint profiles_role_check;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  scope text not null check (scope in ('internal', 'external')),
  icon text,
  logo_url text,
  description text,
  invite_code text unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.groups add column if not exists icon text;
alter table public.groups add column if not exists logo_url text;
alter table public.groups add column if not exists description text;
alter table public.groups add column if not exists invite_code text unique;
alter table public.groups add column if not exists created_by uuid references public.profiles(id);
alter table public.groups add column if not exists updated_at timestamptz default now();

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id),
  scope text not null default 'external' check (scope in ('internal', 'external')),
  type text not null check (type in ('problem', 'idea', 'improvement', 'question')),
  title text not null,
  description text not null,
  emoji text,
  image_url text,
  status text default 'submitted' check (status in ('submitted', 'trending', 'review', 'implementation', 'done')),
  category text,
  report_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.movements add column if not exists scope text default 'external' check (scope in ('internal', 'external'));
alter table public.movements add column if not exists emoji text;
alter table public.movements add column if not exists image_url text;
alter table public.movements add column if not exists report_count integer default 0;
alter table public.movements add column if not exists updated_at timestamptz default now();

create table if not exists public.supports (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid references public.movements(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (movement_id, user_id)
);

create table if not exists public.movement_reactions (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid references public.movements(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('dislike')),
  created_at timestamptz default now(),
  unique (movement_id, user_id, reaction_type)
);

create table if not exists public.movement_updates (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid references public.movements(id) on delete cascade,
  body text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.movement_updates add column if not exists created_by uuid references public.profiles(id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid references public.movements(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  reason text,
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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at before update on public.groups
for each row execute function public.set_updated_at();

drop trigger if exists movements_set_updated_at on public.movements;
create trigger movements_set_updated_at before update on public.movements
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
    and deleted_at is null
  );
$$;

create or replace function public.can_read_group(group_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.groups g
    where g.id = group_uuid
    and (
      g.scope = 'external'
      or public.is_admin()
      or exists (
        select 1 from public.group_members gm
        where gm.group_id = g.id
        and gm.user_id = auth.uid()
      )
    )
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted_username text;
begin
  wanted_username := nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))), '');
  wanted_username := regexp_replace(wanted_username, '[^A-Za-z0-9_]', '_', 'g');

  insert into public.profiles (id, email, username, display_name)
  values (
    new.id,
    new.email,
    wanted_username,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), wanted_username)
  )
  on conflict (id) do update
  set email = excluded.email,
      username = coalesce(public.profiles.username, excluded.username),
      display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.join_group_by_code(code text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into target_group
  from public.groups
  where upper(invite_code) = upper(trim(code))
  and scope = 'internal';

  if target_group.id is null then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (target_group.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return target_group;
end;
$$;

create or replace function public.increment_report_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.movements
  set report_count = coalesce(report_count, 0) + 1
  where id = new.movement_id;
  return new;
end;
$$;

drop trigger if exists reports_increment_movement_count on public.reports;
create trigger reports_increment_movement_count
after insert on public.reports
for each row execute function public.increment_report_count();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.movements enable row level security;
alter table public.supports enable row level security;
alter table public.movement_reactions enable row level security;
alter table public.movement_updates enable row level security;
alter table public.reports enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists groups_read_visible on public.groups;
create policy groups_read_visible on public.groups
for select to anon, authenticated
using (scope = 'external' or public.is_admin() or public.can_read_group(id));

drop policy if exists groups_admin_insert on public.groups;
create policy groups_admin_insert on public.groups
for insert to authenticated
with check (public.is_admin());

drop policy if exists groups_admin_update on public.groups;
create policy groups_admin_update on public.groups
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists groups_admin_delete on public.groups;
create policy groups_admin_delete on public.groups
for delete to authenticated
using (public.is_admin());

drop policy if exists group_members_read_own_or_admin on public.group_members;
create policy group_members_read_own_or_admin on public.group_members
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists group_members_admin_insert on public.group_members;
create policy group_members_admin_insert on public.group_members
for insert to authenticated
with check (public.is_admin());

drop policy if exists group_members_admin_delete on public.group_members;
create policy group_members_admin_delete on public.group_members
for delete to authenticated
using (public.is_admin());

drop policy if exists movements_read_visible on public.movements;
create policy movements_read_visible on public.movements
for select to anon, authenticated
using (
  scope = 'external'
  or public.is_admin()
  or public.can_read_group(group_id)
);

drop policy if exists movements_insert_own on public.movements;
create policy movements_insert_own on public.movements
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    scope = 'external'
    or public.can_read_group(group_id)
  )
);

drop policy if exists movements_update_own on public.movements;
create policy movements_update_own on public.movements
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists movements_delete_owner_or_admin on public.movements;
create policy movements_delete_owner_or_admin on public.movements
for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists supports_read_for_visible_movements on public.supports;
create policy supports_read_for_visible_movements on public.supports
for select to anon, authenticated
using (
  exists (
    select 1 from public.movements m
    where m.id = supports.movement_id
    and (m.scope = 'external' or public.is_admin() or public.can_read_group(m.group_id))
  )
);

drop policy if exists supports_insert_own on public.supports;
create policy supports_insert_own on public.supports
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists supports_delete_own on public.supports;
create policy supports_delete_own on public.supports
for delete to authenticated
using (user_id = auth.uid());

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

drop policy if exists updates_read_for_visible_movements on public.movement_updates;
create policy updates_read_for_visible_movements on public.movement_updates
for select to anon, authenticated
using (
  exists (
    select 1 from public.movements m
    where m.id = movement_updates.movement_id
    and (m.scope = 'external' or public.is_admin() or public.can_read_group(m.group_id))
  )
);

drop policy if exists updates_insert_owner_or_admin on public.movement_updates;
create policy updates_insert_owner_or_admin on public.movement_updates
for insert to authenticated
with check (
  public.is_admin()
  or exists (
    select 1 from public.movements m
    where m.id = movement_updates.movement_id
    and m.user_id = auth.uid()
  )
);

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists reports_admin_read on public.reports;
create policy reports_admin_read on public.reports
for select to authenticated
using (public.is_admin());

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists groups_scope_idx on public.groups(scope);
create index if not exists groups_invite_code_idx on public.groups(invite_code);
create index if not exists group_members_user_id_idx on public.group_members(user_id);
create index if not exists group_members_group_id_idx on public.group_members(group_id);
create index if not exists movements_group_id_idx on public.movements(group_id);
create index if not exists movements_user_id_idx on public.movements(user_id);
create index if not exists supports_movement_id_idx on public.supports(movement_id);
create index if not exists supports_user_id_idx on public.supports(user_id);
create index if not exists movement_reactions_movement_id_idx on public.movement_reactions(movement_id);
create index if not exists movement_reactions_user_id_idx on public.movement_reactions(user_id);
create index if not exists movement_updates_movement_id_idx on public.movement_updates(movement_id);
create index if not exists reports_movement_id_idx on public.reports(movement_id);

grant usage on schema public to anon, authenticated;

grant select on public.groups to anon, authenticated;
grant insert, update, delete on public.groups to authenticated;

grant select on public.movements to anon, authenticated;
grant insert, update, delete on public.movements to authenticated;

grant select on public.supports to anon, authenticated;
grant insert, delete on public.supports to authenticated;

grant select on public.movement_reactions to anon, authenticated;
grant insert, delete on public.movement_reactions to authenticated;

grant select on public.movement_updates to anon, authenticated;
grant insert on public.movement_updates to authenticated;

grant select, insert, update on public.profiles to authenticated;

grant select, insert, delete on public.group_members to authenticated;

grant insert on public.reports to authenticated;
grant select on public.reports to authenticated;

grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.can_read_group(uuid) to anon, authenticated;
