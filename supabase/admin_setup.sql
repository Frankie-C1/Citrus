insert into public.profiles (
  id,
  email,
  username,
  display_name,
  role,
  has_seen_conduct_notice,
  created_at,
  updated_at
)
select
  u.id,
  u.email,
  'ADMIN',
  'ADMIN',
  'admin',
  false,
  now(),
  now()
from auth.users u
where lower(u.email) = lower('fcarone@web.de')
on conflict (id) do update
set
  email = excluded.email,
  username = 'ADMIN',
  display_name = 'ADMIN',
  role = 'admin',
  updated_at = now();
