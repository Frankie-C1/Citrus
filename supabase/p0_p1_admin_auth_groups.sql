-- P0/P1 fixes: auth lookup, bans, status updates and admin group safety.
-- Run once in the Supabase SQL editor before testing the deployed app.

alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists is_banned boolean not null default false;

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (status in ('active', 'banned')) not valid;
alter table public.profiles validate constraint profiles_status_check;

update public.profiles
set email = lower(trim(email))
where email is not null;

create unique index if not exists profiles_email_lower_unique_idx
  on public.profiles (lower(email))
  where email is not null;

create unique index if not exists profiles_username_lower_unique_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.movement_updates add column if not exists status text;
alter table public.movement_updates drop constraint if exists movement_updates_status_check;
alter table public.movement_updates
  add constraint movement_updates_status_check
  check (status is null or status in ('submitted', 'trending', 'review', 'implementation', 'done')) not valid;
alter table public.movement_updates validate constraint movement_updates_status_check;

create unique index if not exists groups_invite_code_upper_unique_idx
  on public.groups (upper(invite_code))
  where invite_code is not null;

create or replace function public.resolve_login_identifier(identifier text)
returns table(email text, status text, is_banned boolean, deleted_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select p.email, p.status, p.is_banned, p.deleted_at
  from public.profiles p
  where lower(p.username) = lower(trim(identifier))
  limit 1;
$$;

create or replace function public.profile_identifier_exists(email_input text, username_input text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'email_exists', exists (
      select 1 from public.profiles p
      where lower(p.email) = lower(trim(email_input))
    ),
    'username_exists', exists (
      select 1 from public.profiles p
      where lower(p.username) = lower(trim(username_input))
    )
  );
$$;

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
      and status <> 'banned'
      and coalesce(is_banned, false) = false
  );
$$;

drop policy if exists movements_update_own_or_admin on public.movements;
create policy movements_update_own_or_admin on public.movements
for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

grant execute on function public.resolve_login_identifier(text) to anon, authenticated;
grant execute on function public.profile_identifier_exists(text, text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
