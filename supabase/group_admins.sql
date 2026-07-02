-- Gruppenadmins: scoped admin rights per internal group.
-- Run after the existing schema/posting/admin SQL files.

create table if not exists public.group_admins (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists group_admins_group_user_unique_idx
  on public.group_admins(group_id, user_id);

create index if not exists group_admins_group_id_idx on public.group_admins(group_id);
create index if not exists group_admins_user_id_idx on public.group_admins(user_id);

create or replace function public.is_global_admin(user_uuid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_uuid
      and p.role = 'admin'
      and p.deleted_at is null
      and coalesce(p.status, 'active') <> 'banned'
      and coalesce(p.is_banned, false) = false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_global_admin(auth.uid());
$$;

create or replace function public.is_group_admin(user_uuid uuid, group_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_global_admin(user_uuid)
    or exists (
      select 1
      from public.group_admins ga
      where ga.user_id = user_uuid
        and ga.group_id = group_uuid
    );
$$;

create or replace function public.can_manage_group(group_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_group_admin(auth.uid(), group_uuid);
$$;

create or replace function public.search_group_admin_candidates(query_text text, target_group_id uuid)
returns table (
  id uuid,
  email text,
  username text,
  display_name text,
  avatar_url text,
  role text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.email, p.username, p.display_name, p.avatar_url, p.role
  from public.profiles p
  where public.can_manage_group(target_group_id)
    and p.deleted_at is null
    and coalesce(p.status, 'active') <> 'banned'
    and (
      p.username ilike '%' || trim(query_text) || '%'
      or p.display_name ilike '%' || trim(query_text) || '%'
      or p.email ilike '%' || trim(query_text) || '%'
    )
  order by p.username nulls last, p.display_name nulls last
  limit 12;
$$;

alter table public.group_admins enable row level security;

drop policy if exists group_admins_select_managed on public.group_admins;
create policy group_admins_select_managed
on public.group_admins for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or user_id = auth.uid()
  or public.is_group_admin(auth.uid(), group_id)
);

drop policy if exists group_admins_insert_managed on public.group_admins;
create policy group_admins_insert_managed
on public.group_admins for insert
to authenticated
with check (public.is_group_admin(auth.uid(), group_id));

drop policy if exists group_admins_delete_managed on public.group_admins;
create policy group_admins_delete_managed
on public.group_admins for delete
to authenticated
using (public.is_group_admin(auth.uid(), group_id));

drop policy if exists profiles_select_group_admin_scope on public.profiles;
create policy profiles_select_group_admin_scope
on public.profiles for select
to authenticated
using (
  public.is_global_admin(auth.uid())
  or id = auth.uid()
  or exists (
    select 1
    from public.group_members target_member
    join public.group_admins own_admin
      on own_admin.group_id = target_member.group_id
     and own_admin.user_id = auth.uid()
    where target_member.user_id = profiles.id
  )
);

drop policy if exists groups_admin_update on public.groups;
create policy groups_admin_update
on public.groups for update
to authenticated
using (public.can_manage_group(id))
with check (public.can_manage_group(id));

drop policy if exists group_members_read_own_or_admin on public.group_members;
create policy group_members_read_own_or_admin
on public.group_members for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_global_admin(auth.uid())
  or public.is_group_admin(auth.uid(), group_id)
);

drop policy if exists group_members_admin_insert on public.group_members;
create policy group_members_admin_insert
on public.group_members for insert
to authenticated
with check (public.is_group_admin(auth.uid(), group_id));

drop policy if exists group_members_delete_own_or_admin on public.group_members;
create policy group_members_delete_own_or_admin
on public.group_members for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_global_admin(auth.uid())
  or public.is_group_admin(auth.uid(), group_id)
);

drop policy if exists movements_update_own_or_admin on public.movements;
create policy movements_update_own_or_admin
on public.movements for update
to authenticated
using (user_id = auth.uid() or public.is_group_admin(auth.uid(), group_id))
with check (user_id = auth.uid() or public.is_group_admin(auth.uid(), group_id));

drop policy if exists movements_update_own on public.movements;
drop policy if exists movements_delete_owner_or_admin on public.movements;
create policy movements_delete_owner_or_admin
on public.movements for delete
to authenticated
using (user_id = auth.uid() or public.is_group_admin(auth.uid(), group_id));

drop policy if exists updates_insert_owner_or_admin on public.movement_updates;
create policy updates_insert_owner_or_admin
on public.movement_updates for insert
to authenticated
with check (
  exists (
    select 1
    from public.movements m
    where m.id = movement_updates.movement_id
      and (m.user_id = auth.uid() or public.is_group_admin(auth.uid(), m.group_id))
  )
);

grant select, insert, delete on public.group_admins to authenticated;
grant execute on function public.is_global_admin(uuid) to anon, authenticated;
grant execute on function public.is_group_admin(uuid, uuid) to anon, authenticated;
grant execute on function public.can_manage_group(uuid) to authenticated;
grant execute on function public.search_group_admin_candidates(text, uuid) to authenticated;
