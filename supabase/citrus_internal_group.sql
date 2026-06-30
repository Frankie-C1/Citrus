update public.groups
set invite_code = 'CITRS'
where name = 'Citrus-Gruppe'
  and upper(coalesce(invite_code, '')) <> 'CITRS'
  and not exists (select 1 from public.groups where upper(invite_code) = 'CITRS');

insert into public.groups (name, category, scope, icon, description, invite_code)
values (
  'Citrus-Gruppe',
  'Community',
  'internal',
  'C',
  'Interne Gruppe für Feedback, Bugs und Verbesserungsvorschläge zur Citrus-App.',
  'CITRS'
)
on conflict (invite_code) do update
set
  name = excluded.name,
  category = excluded.category,
  scope = excluded.scope,
  icon = excluded.icon,
  description = excluded.description,
  updated_at = now();
