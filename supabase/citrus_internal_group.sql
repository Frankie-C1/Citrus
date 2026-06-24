insert into public.groups (name, category, scope, icon, description, invite_code)
values (
  'Citrus',
  'App',
  'internal',
  'C',
  'Interne Gruppe für Feedback, Bugs und Verbesserungsvorschläge zur Citrus-App.',
  'CITRUS'
)
on conflict (invite_code) do update
set
  name = excluded.name,
  category = excluded.category,
  scope = excluded.scope,
  icon = excluded.icon,
  description = excluded.description,
  updated_at = now();
