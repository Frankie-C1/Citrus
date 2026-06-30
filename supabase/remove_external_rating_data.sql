-- Run manually in Supabase SQL editor if older external-rating demo data exists.
-- This keeps internal groups and their movements intact.

with external_groups as (
  select id from public.groups where scope = 'external'
),
external_movements as (
  select id from public.movements
  where scope = 'external'
     or group_id in (select id from external_groups)
)
delete from public.notifications
where movement_id in (select id from external_movements);

with external_groups as (
  select id from public.groups where scope = 'external'
),
external_movements as (
  select id from public.movements
  where scope = 'external'
     or group_id in (select id from external_groups)
)
delete from public.movement_updates
where movement_id in (select id from external_movements);

with external_groups as (
  select id from public.groups where scope = 'external'
),
external_movements as (
  select id from public.movements
  where scope = 'external'
     or group_id in (select id from external_groups)
)
delete from public.supports
where movement_id in (select id from external_movements);

with external_groups as (
  select id from public.groups where scope = 'external'
),
external_movements as (
  select id from public.movements
  where scope = 'external'
     or group_id in (select id from external_groups)
)
delete from public.reports
where movement_id in (select id from external_movements);

delete from public.movements
where scope = 'external'
   or group_id in (select id from public.groups where scope = 'external');

delete from public.group_members
where group_id in (select id from public.groups where scope = 'external');

delete from public.groups
where scope = 'external';
