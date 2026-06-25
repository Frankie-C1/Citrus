-- Citrus mobile/posting/admin bugfixes
-- Run this once in the Supabase SQL editor for the deployed project.

alter table public.movements enable row level security;
alter table public.profiles enable row level security;

alter table public.movements
  add column if not exists is_anonymous boolean not null default false;

alter table public.movements
  add column if not exists background_type text default 'emoji';

alter table public.movements
  add column if not exists background_value text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'movements_background_type_check'
      and conrelid = 'public.movements'::regclass
  ) then
    alter table public.movements
      add constraint movements_background_type_check
      check (background_type in ('image', 'color', 'gradient', 'emoji'));
  end if;
end $$;

alter table public.profiles
  add column if not exists deleted_at timestamptz;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and deleted_at is null
  );
$$;

grant execute on function public.is_admin() to authenticated;

create index if not exists movements_scope_created_at_idx on public.movements(scope, created_at desc);
create index if not exists movements_user_id_idx on public.movements(user_id);
create index if not exists movements_group_id_idx on public.movements(group_id);
create index if not exists group_members_lookup_idx on public.group_members(group_id, user_id);

-- Keep movement deletion usable from the app by cascading dependent MVP tables.
do $$
declare
  target record;
begin
  for target in
    select tc.table_schema, tc.table_name, kcu.column_name, tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name in ('supports', 'reports', 'movement_updates', 'notifications')
      and kcu.column_name = 'movement_id'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'movements'
      and ccu.column_name = 'id'
  loop
    execute format('alter table %I.%I drop constraint %I', target.table_schema, target.table_name, target.constraint_name);
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references public.movements(id) on delete cascade',
      target.table_schema,
      target.table_name,
      target.constraint_name,
      target.column_name
    );
  end loop;
end $$;

drop policy if exists "public can read external movements" on public.movements;
create policy "public can read external movements"
on public.movements
for select
using (scope = 'external');

drop policy if exists "members can read internal movements" on public.movements;
create policy "members can read internal movements"
on public.movements
for select
to authenticated
using (
  scope = 'internal'
  and exists (
    select 1 from public.group_members gm
    where gm.group_id = movements.group_id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists "users can insert own movements" on public.movements;
create policy "users can insert own movements"
on public.movements
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can update own movements" on public.movements;
create policy "users can update own movements"
on public.movements
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users can delete own movements" on public.movements;
create policy "users can delete own movements"
on public.movements
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "admins can read all movements" on public.movements;
create policy "admins can read all movements"
on public.movements
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can update all movements" on public.movements;
create policy "admins can update all movements"
on public.movements
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can delete all movements" on public.movements;
create policy "admins can delete all movements"
on public.movements
for delete
to authenticated
using (public.is_admin());

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "admins can read profiles" on public.profiles;
create policy "admins can read profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can update profiles" on public.profiles;
create policy "admins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());