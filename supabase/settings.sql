create extension if not exists pgcrypto;

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'system',
  privacy_visibility text not null default 'visible',
  feed_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint user_settings_theme_check check (theme in ('light', 'dark', 'system')),
  constraint user_settings_privacy_check check (privacy_visibility in ('visible', 'anonymous'))
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  new_group_posts text not null default 'daily',
  own_post_support text not null default 'instant',
  supported_updates text not null default 'daily',
  group_trending text not null default 'daily',
  implemented_projects text not null default 'instant',
  group_ids uuid[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint notification_preferences_frequency_check check (
    new_group_posts in ('off', 'daily', 'instant')
    and own_post_support in ('off', 'daily', 'instant')
    and supported_updates in ('off', 'daily', 'instant')
    and group_trending in ('off', 'daily', 'instant')
    and implemented_projects in ('off', 'daily', 'instant')
  )
);

create table if not exists public.user_interests (
  user_id uuid references public.profiles(id) on delete cascade,
  category text not null,
  created_at timestamptz default now(),
  primary key (user_id, category)
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, blocked_user_id),
  constraint user_blocks_no_self_block check (user_id <> blocked_user_id)
);

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists feedback_set_updated_at on public.feedback;
create trigger feedback_set_updated_at before update on public.feedback
for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_interests enable row level security;
alter table public.feedback enable row level security;
alter table public.user_blocks enable row level security;

drop policy if exists user_settings_own_select on public.user_settings;
create policy user_settings_own_select on public.user_settings
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_settings_own_insert on public.user_settings;
create policy user_settings_own_insert on public.user_settings
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists user_settings_own_update on public.user_settings;
create policy user_settings_own_update on public.user_settings
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notification_preferences_own_select on public.notification_preferences;
create policy notification_preferences_own_select on public.notification_preferences
for select to authenticated
using (user_id = auth.uid());

drop policy if exists notification_preferences_own_insert on public.notification_preferences;
create policy notification_preferences_own_insert on public.notification_preferences
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists notification_preferences_own_update on public.notification_preferences;
create policy notification_preferences_own_update on public.notification_preferences
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_interests_own_select on public.user_interests;
create policy user_interests_own_select on public.user_interests
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_interests_own_insert on public.user_interests;
create policy user_interests_own_insert on public.user_interests
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists user_interests_own_delete on public.user_interests;
create policy user_interests_own_delete on public.user_interests
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists feedback_own_insert on public.feedback;
create policy feedback_own_insert on public.feedback
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists feedback_own_or_admin_select on public.feedback;
create policy feedback_own_or_admin_select on public.feedback
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_blocks_own_select on public.user_blocks;
create policy user_blocks_own_select on public.user_blocks
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_blocks_own_insert on public.user_blocks;
create policy user_blocks_own_insert on public.user_blocks
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists user_blocks_own_delete on public.user_blocks;
create policy user_blocks_own_delete on public.user_blocks
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists reports_select_own_or_admin on public.reports;
create policy reports_select_own_or_admin on public.reports
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create index if not exists user_interests_user_idx on public.user_interests(user_id);
create index if not exists feedback_user_idx on public.feedback(user_id, created_at desc);
create index if not exists user_blocks_user_idx on public.user_blocks(user_id);

grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert, delete on public.user_interests to authenticated;
grant select, insert on public.feedback to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
