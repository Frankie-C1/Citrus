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
alter table public.notifications add column if not exists category text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists target_type text;
alter table public.notifications add column if not exists target_id uuid;
alter table public.notifications add column if not exists is_read boolean not null default false;
alter table public.notifications add column if not exists expires_at timestamptz default (now() + interval '1 day');
alter table public.notifications add column if not exists created_at timestamptz default now();

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  new_group_posts text not null default 'daily',
  own_post_support text not null default 'instant',
  supported_updates text not null default 'daily',
  group_trending text not null default 'daily',
  implemented_projects text not null default 'instant',
  group_ids uuid[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.notification_daily_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  body text,
  movement_id uuid references public.movements(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  target_type text,
  target_id uuid,
  digest_date date not null default current_date,
  processed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.notification_push_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete cascade,
  admin_notification_id uuid,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  error text,
  created_at timestamptz default now()
);

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  target_type text,
  target_id uuid,
  is_read boolean not null default false,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '3 months')
);

alter table public.admin_notifications add column if not exists target_type text;
alter table public.admin_notifications add column if not exists target_id uuid;
alter table public.admin_notifications add column if not exists expires_at timestamptz default (now() + interval '3 months');

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_push_subscriptions enable row level security;
alter table public.notification_daily_queue enable row level security;
alter table public.notification_push_outbox enable row level security;
alter table public.admin_notifications enable row level security;

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications
for select to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
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

drop policy if exists user_push_subscriptions_own_select on public.user_push_subscriptions;
create policy user_push_subscriptions_own_select on public.user_push_subscriptions
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_push_subscriptions_own_insert on public.user_push_subscriptions;
create policy user_push_subscriptions_own_insert on public.user_push_subscriptions
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists user_push_subscriptions_own_update on public.user_push_subscriptions;
create policy user_push_subscriptions_own_update on public.user_push_subscriptions
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notification_daily_queue_own_select on public.notification_daily_queue;
create policy notification_daily_queue_own_select on public.notification_daily_queue
for select to authenticated
using (user_id = auth.uid());

drop policy if exists admin_notifications_admin_select on public.admin_notifications;
create policy admin_notifications_admin_select on public.admin_notifications
for select to authenticated
using (public.is_admin() and admin_user_id = auth.uid());

drop policy if exists admin_notifications_admin_update on public.admin_notifications;
create policy admin_notifications_admin_update on public.admin_notifications
for update to authenticated
using (public.is_admin() and admin_user_id = auth.uid())
with check (public.is_admin() and admin_user_id = auth.uid());

create or replace function public.enqueue_user_notification(
  target_user_id uuid,
  pref text,
  notification_category text,
  notification_title text,
  notification_body text,
  notification_movement_id uuid default null,
  notification_group_id uuid default null,
  notification_target_type text default null,
  notification_target_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if target_user_id is null or coalesce(pref, 'off') = 'off' then
    return;
  end if;

  if pref = 'daily' then
    insert into public.notification_daily_queue (
      user_id, category, title, body, movement_id, group_id, target_type, target_id
    )
    values (
      target_user_id, notification_category, notification_title, notification_body,
      notification_movement_id, notification_group_id, notification_target_type, notification_target_id
    );
    return;
  end if;

  insert into public.notifications (
    user_id, movement_id, type, category, title, body, target_type, target_id, expires_at
  )
  values (
    target_user_id, notification_movement_id, notification_category, notification_category,
    notification_title, notification_body, notification_target_type, notification_target_id,
    now() + interval '1 day'
  )
  returning id into inserted_id;

  insert into public.notification_push_outbox (user_id, notification_id, title, body, payload)
  values (
    target_user_id,
    inserted_id,
    notification_title,
    notification_body,
    jsonb_build_object(
      'notificationId', inserted_id,
      'movementId', notification_movement_id,
      'targetType', notification_target_type,
      'targetId', notification_target_id,
      'category', notification_category
    )
  );
end;
$$;

create or replace function public.notify_new_group_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
  group_name text;
begin
  if new.group_id is null then
    return new;
  end if;

  select name into group_name from public.groups where id = new.group_id;

  for recipient in
    select np.user_id, coalesce(np.new_group_posts, 'off') as pref
    from public.notification_preferences np
    where new.group_id = any(np.group_ids)
      and np.user_id <> new.user_id
      and coalesce(np.new_group_posts, 'off') <> 'off'
  loop
    perform public.enqueue_user_notification(
      recipient.user_id,
      recipient.pref,
      'new_group_posts',
      'Neuer Beitrag in ' || coalesce(group_name, 'deiner Gruppe'),
      new.title,
      new.id,
      new.group_id,
      'movement',
      new.id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists movements_notify_new_group_post on public.movements;
create trigger movements_notify_new_group_post
after insert on public.movements
for each row execute function public.notify_new_group_post();

create or replace function public.notify_movement_support()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_row public.movements;
  pref text;
begin
  select * into movement_row from public.movements where id = new.movement_id;
  if movement_row.user_id is null or movement_row.user_id = new.user_id then
    return new;
  end if;

  select coalesce(np.own_post_support, 'instant') into pref
  from public.profiles p
  left join public.notification_preferences np on np.user_id = p.id
  where p.id = movement_row.user_id;

  perform public.enqueue_user_notification(
    movement_row.user_id,
    pref,
    'own_post_support',
    'Neue Unterstützung',
    movement_row.title,
    movement_row.id,
    movement_row.group_id,
    'movement',
    movement_row.id
  );

  return new;
end;
$$;

drop trigger if exists supports_notify_owner on public.supports;
create trigger supports_notify_owner
after insert on public.supports
for each row execute function public.notify_movement_support();

create or replace function public.notify_supported_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_row public.movements;
  recipient record;
begin
  select * into movement_row from public.movements where id = new.movement_id;

  for recipient in
    select distinct s.user_id, coalesce(np.supported_updates, 'daily') as pref
    from public.supports s
    left join public.notification_preferences np on np.user_id = s.user_id
    where s.movement_id = new.movement_id
      and s.user_id is not null
      and s.user_id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
      and coalesce(np.supported_updates, 'daily') <> 'off'
  loop
    perform public.enqueue_user_notification(
      recipient.user_id,
      recipient.pref,
      'supported_updates',
      'Update zu einem unterstützten Thema',
      coalesce(movement_row.title, new.body),
      new.movement_id,
      movement_row.group_id,
      'movement',
      new.movement_id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists movement_updates_notify_supporters on public.movement_updates;
create trigger movement_updates_notify_supporters
after insert on public.movement_updates
for each row execute function public.notify_supported_update();

create or replace function public.notify_implemented_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
begin
  if new.status <> 'done' or old.status = 'done' then
    return new;
  end if;

  for recipient in
    select distinct user_id, pref from (
      select new.user_id as user_id, 'instant'::text as pref
      union
      select s.user_id, coalesce(np.implemented_projects, 'instant') as pref
      from public.supports s
      left join public.notification_preferences np on np.user_id = s.user_id
      where s.movement_id = new.id
    ) recipients
    where user_id is not null and coalesce(pref, 'off') <> 'off'
  loop
    perform public.enqueue_user_notification(
      recipient.user_id,
      recipient.pref,
      'implemented_projects',
      'Projekt umgesetzt',
      new.title,
      new.id,
      new.group_id,
      'movement',
      new.id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists movements_notify_implemented_project on public.movements;
create trigger movements_notify_implemented_project
after update of status on public.movements
for each row execute function public.notify_implemented_project();

create or replace function public.enqueue_trending_notification(movement_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_row public.movements;
  recipient record;
begin
  select * into movement_row from public.movements where id = movement_uuid;
  if movement_row.id is null then
    return;
  end if;

  for recipient in
    select np.user_id, coalesce(np.group_trending, 'off') as pref
    from public.notification_preferences np
    where movement_row.group_id = any(np.group_ids)
      and coalesce(np.group_trending, 'off') <> 'off'
  loop
    perform public.enqueue_user_notification(
      recipient.user_id,
      recipient.pref,
      'group_trending',
      'Trending-Thema in deiner Gruppe',
      movement_row.title,
      movement_row.id,
      movement_row.group_id,
      'movement',
      movement_row.id
    );
  end loop;
end;
$$;

create or replace function public.enqueue_admin_notification(
  admin_type text,
  notification_title text,
  notification_body text,
  notification_target_type text,
  notification_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_profile record;
  inserted_id uuid;
begin
  for admin_profile in
    select id from public.profiles where role = 'admin' and deleted_at is null
  loop
    insert into public.admin_notifications (
      admin_user_id, type, title, body, target_type, target_id, expires_at
    )
    values (
      admin_profile.id,
      admin_type,
      notification_title,
      notification_body,
      notification_target_type,
      notification_target_id,
      now() + interval '3 months'
    )
    returning id into inserted_id;

    insert into public.notification_push_outbox (user_id, admin_notification_id, title, body, payload)
    values (
      admin_profile.id,
      inserted_id,
      notification_title,
      notification_body,
      jsonb_build_object(
        'notificationId', inserted_id,
        'admin', true,
        'targetType', notification_target_type,
        'targetId', notification_target_id,
        'category', admin_type
      )
    );
  end loop;
end;
$$;

create or replace function public.notify_admin_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enqueue_admin_notification(
    'report',
    'Neue Meldung',
    coalesce(new.reason, 'Ein Inhalt wurde gemeldet.'),
    'report',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists reports_notify_admin on public.reports;
create trigger reports_notify_admin
after insert on public.reports
for each row execute function public.notify_admin_report();

create or replace function public.notify_admin_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enqueue_admin_notification(
    'feedback',
    'Neues Feedback',
    new.subject,
    'feedback',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists feedback_notify_admin on public.feedback;
create trigger feedback_notify_admin
after insert on public.feedback
for each row execute function public.notify_admin_feedback();

create or replace function public.notify_admin_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enqueue_admin_notification(
    'block',
    'Neuer Block',
    'Ein Nutzer hat einen anderen Nutzer blockiert.',
    'block',
    new.id
  );
  return new;
end;
$$;

drop trigger if exists user_blocks_notify_admin on public.user_blocks;
create trigger user_blocks_notify_admin
after insert on public.user_blocks
for each row execute function public.notify_admin_block();

create or replace function public.cleanup_old_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notifications
  where created_at < now() - interval '1 day';

  delete from public.admin_notifications
  where created_at < now() - interval '3 months';

  delete from public.notification_daily_queue
  where processed_at is not null
  and created_at < now() - interval '7 days';

  delete from public.notification_push_outbox
  where sent_at is not null
  and created_at < now() - interval '7 days';
$$;

create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read, created_at desc);
create index if not exists notifications_expiry_idx on public.notifications(created_at);
create index if not exists admin_notifications_admin_read_idx on public.admin_notifications(admin_user_id, is_read, created_at desc);
create index if not exists admin_notifications_expiry_idx on public.admin_notifications(created_at);
create index if not exists push_subscriptions_user_idx on public.user_push_subscriptions(user_id);
create index if not exists daily_queue_user_date_idx on public.notification_daily_queue(user_id, digest_date, processed_at);
create index if not exists push_outbox_pending_idx on public.notification_push_outbox(sent_at, created_at);

grant select, update on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert, update on public.user_push_subscriptions to authenticated;
grant select on public.notification_daily_queue to authenticated;
grant select, update on public.admin_notifications to authenticated;
grant execute on function public.enqueue_trending_notification(uuid) to service_role;
grant execute on function public.cleanup_old_notifications() to service_role;
