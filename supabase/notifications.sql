create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  movement_id uuid references public.movements(id) on delete cascade,
  type text,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

alter table public.notifications add column if not exists movement_id uuid references public.movements(id) on delete cascade;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists is_read boolean not null default false;
alter table public.notifications add column if not exists created_at timestamptz default now();

alter table public.notifications enable row level security;

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own
on public.notifications for select
to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notifications_admin_insert on public.notifications;
create policy notifications_admin_insert
on public.notifications for insert
to authenticated
with check (public.is_admin());

create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read, created_at desc);
create index if not exists notifications_movement_id_idx on public.notifications(movement_id);

grant select, update on public.notifications to authenticated;
grant insert on public.notifications to authenticated;
