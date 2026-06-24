create extension if not exists pgcrypto;

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
  group_id uuid references public.groups(id) on delete cascade,
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

alter table public.movements add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.movements add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.movements add column if not exists scope text not null default 'external';
alter table public.movements add column if not exists type text;
alter table public.movements add column if not exists emoji text;
alter table public.movements add column if not exists image_url text;
alter table public.movements add column if not exists status text default 'submitted';
alter table public.movements add column if not exists category text;
alter table public.movements add column if not exists report_count integer default 0;
alter table public.movements add column if not exists updated_at timestamptz default now();

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

alter table public.movements drop constraint if exists movements_group_id_fkey;
alter table public.movements add constraint movements_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.movements drop constraint if exists movements_user_id_fkey;
alter table public.movements add constraint movements_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.supports drop constraint if exists supports_movement_id_fkey;
alter table public.supports add constraint supports_movement_id_fkey
  foreign key (movement_id) references public.movements(id) on delete cascade;

alter table public.supports drop constraint if exists supports_user_id_fkey;
alter table public.supports add constraint supports_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.movement_updates drop constraint if exists movement_updates_movement_id_fkey;
alter table public.movement_updates add constraint movement_updates_movement_id_fkey
  foreign key (movement_id) references public.movements(id) on delete cascade;

alter table public.reports drop constraint if exists reports_movement_id_fkey;
alter table public.reports add constraint reports_movement_id_fkey
  foreign key (movement_id) references public.movements(id) on delete cascade;

alter table public.group_members drop constraint if exists group_members_group_id_fkey;
alter table public.group_members add constraint group_members_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.group_members drop constraint if exists group_members_user_id_fkey;
alter table public.group_members add constraint group_members_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

create unique index if not exists group_members_group_user_unique_idx
  on public.group_members(group_id, user_id);

create unique index if not exists supports_movement_user_unique_idx
  on public.supports(movement_id, user_id);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
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
    select 1
    from public.groups g
    where g.id = group_uuid
      and (
        g.scope = 'external'
        or public.is_admin()
        or exists (
          select 1
          from public.group_members gm
          where gm.group_id = g.id
            and gm.user_id = auth.uid()
        )
      )
  );
$$;

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

  select *
  into target_group
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

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.movements enable row level security;
alter table public.supports enable row level security;
alter table public.movement_updates enable row level security;
alter table public.reports enable row level security;

drop policy if exists groups_read_visible on public.groups;
create policy groups_read_visible
on public.groups for select
to anon, authenticated
using (scope = 'external' or public.is_admin() or public.can_read_group(id));

drop policy if exists groups_admin_insert on public.groups;
create policy groups_admin_insert
on public.groups for insert
to authenticated
with check (public.is_admin());

drop policy if exists groups_admin_update on public.groups;
create policy groups_admin_update
on public.groups for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists groups_admin_delete on public.groups;
create policy groups_admin_delete
on public.groups for delete
to authenticated
using (public.is_admin());

drop policy if exists group_members_read_own_or_admin on public.group_members;
create policy group_members_read_own_or_admin
on public.group_members for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists group_members_admin_insert on public.group_members;
create policy group_members_admin_insert
on public.group_members for insert
to authenticated
with check (public.is_admin());

drop policy if exists group_members_delete_own_or_admin on public.group_members;
create policy group_members_delete_own_or_admin
on public.group_members for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists movements_read_visible on public.movements;
create policy movements_read_visible
on public.movements for select
to anon, authenticated
using (
  scope = 'external'
  or user_id = auth.uid()
  or public.is_admin()
  or public.can_read_group(group_id)
);

drop policy if exists movements_insert_own on public.movements;
create policy movements_insert_own
on public.movements for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    scope = 'external'
    or public.can_read_group(group_id)
    or public.is_admin()
  )
);

drop policy if exists movements_update_own on public.movements;
create policy movements_update_own
on public.movements for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists movements_delete_owner_or_admin on public.movements;
create policy movements_delete_owner_or_admin
on public.movements for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists supports_read_for_visible_movements on public.supports;
create policy supports_read_for_visible_movements
on public.supports for select
to anon, authenticated
using (
  exists (
    select 1
    from public.movements m
    where m.id = supports.movement_id
      and (
        m.scope = 'external'
        or m.user_id = auth.uid()
        or public.is_admin()
        or public.can_read_group(m.group_id)
      )
  )
);

drop policy if exists supports_insert_own on public.supports;
create policy supports_insert_own
on public.supports for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists supports_delete_own on public.supports;
create policy supports_delete_own
on public.supports for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists updates_read_for_visible_movements on public.movement_updates;
create policy updates_read_for_visible_movements
on public.movement_updates for select
to anon, authenticated
using (
  exists (
    select 1
    from public.movements m
    where m.id = movement_updates.movement_id
      and (
        m.scope = 'external'
        or m.user_id = auth.uid()
        or public.is_admin()
        or public.can_read_group(m.group_id)
      )
  )
);

drop policy if exists updates_insert_owner_or_admin on public.movement_updates;
create policy updates_insert_owner_or_admin
on public.movement_updates for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.movements m
    where m.id = movement_updates.movement_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own
on public.reports for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists reports_admin_read on public.reports;
create policy reports_admin_read
on public.reports for select
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'movement-media',
  'movement-media',
  true,
  3145728,
  array['image/avif', 'image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists movement_media_public_read on storage.objects;
create policy movement_media_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'movement-media');

drop policy if exists movement_media_authenticated_upload on storage.objects;
create policy movement_media_authenticated_upload
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'movement-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists movement_media_owner_update on storage.objects;
create policy movement_media_owner_update
on storage.objects for update
to authenticated
using (bucket_id = 'movement-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'movement-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists movement_media_owner_delete on storage.objects;
create policy movement_media_owner_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'movement-media' and (storage.foldername(name))[1] = auth.uid()::text);

grant usage on schema public to anon, authenticated;
grant select on public.groups to anon, authenticated;
grant select on public.movements to anon, authenticated;
grant select on public.supports to anon, authenticated;
grant select on public.movement_updates to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant insert, update, delete on public.movements to authenticated;
grant insert, delete on public.supports to authenticated;
grant insert on public.movement_updates to authenticated;
grant insert on public.reports to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.can_read_group(uuid) to anon, authenticated;
