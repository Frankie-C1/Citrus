update public.groups
set invite_code = 'CITRS'
where name = 'Citrus-Gruppe'
  and upper(coalesce(invite_code, '')) <> 'CITRS'
  and not exists (select 1 from public.groups where upper(invite_code) = 'CITRS');

insert into public.groups (name, category, scope, icon, description, invite_code)
select name, category, scope, icon, description, invite_code
from (values
  ('Citrus-Gruppe', 'Community', 'internal', 'C', 'Startgruppe für Feedback, Ideen und Verbesserungen an Citrus.', 'CITRS'),
  ('DHBW Mosbach', 'Hochschule', 'internal', 'DH', 'Campus-Ideen von Studierenden und Teams.', 'DHBW5'),
  ('Muster GmbH', 'Firma', 'internal', 'MG', 'Interne Verbesserungen für moderne Zusammenarbeit.', 'MSTR5'),
  ('FC Musterstadt', 'Verein', 'internal', 'FC', 'Sport, Gemeinschaft und Vereinsleben.', 'FC123')
) as seed_groups(name, category, scope, icon, description, invite_code)
on conflict (invite_code) do update
set
  name = excluded.name,
  category = excluded.category,
  scope = excluded.scope,
  icon = excluded.icon,
  description = excluded.description,
  updated_at = now();

with g as (
  select id, name, invite_code from public.groups
)
insert into public.movements (title, description, type, status, group_id, scope, category, emoji, created_at)
select title, description, type, status, group_id, scope, category, emoji, created_at
from (values
  ('Suche soll Gruppen schneller finden', 'Interne Anliegen, Gruppen und Updates sollen ohne Umwege auffindbar sein.', 'improvement', 'review', (select id from g where invite_code = 'CITRS'), 'internal', 'App', 'C', now() - interval '1 hour'),
  ('Mehr Lernräume auf dem Campus', 'Ruhige, verlässlich buchbare Räume für Prüfungsphasen und Gruppenarbeit.', 'idea', 'submitted', (select id from g where invite_code = 'DHBW5'), 'internal', 'Campus', '*', now() - interval '3 days'),
  ('Meetingfreier Freitagvormittag', 'Ein gemeinsamer Fokusblock für Deep Work ohne Regeltermin-Konflikte.', 'improvement', 'review', (select id from g where invite_code = 'MSTR5'), 'internal', 'Arbeit', '+', now() - interval '2 days'),
  ('Neuer Basketballplatz im Viertel', 'Ein frei zugänglicher Court mit Licht, Sitzplätzen und fairer Nutzung für Jugendliche.', 'idea', 'implementation', (select id from g where invite_code = 'FC123'), 'internal', 'Sport', '*', now() - interval '8 days')
) as seed_movements(title, description, type, status, group_id, scope, category, emoji, created_at)
where not exists (
  select 1 from public.movements existing
  where existing.title = seed_movements.title
);

insert into public.movement_updates (movement_id, body, created_at)
select m.id, update_body, now() - update_age
from public.movements m
join lateral (values
  ('Das Thema gewinnt diese Woche stark an Unterstützung.', interval '2 days'),
  ('Viele Nutzer nennen ähnliche Probleme im gleichen Bereich.', interval '1 day')
) as updates(update_body, update_age) on true
where m.title in (
  'Suche soll Gruppen schneller finden',
  'Mehr Lernräume auf dem Campus',
  'Meetingfreier Freitagvormittag',
  'Neuer Basketballplatz im Viertel'
)
and not exists (
  select 1 from public.movement_updates existing
  where existing.movement_id = m.id
  and existing.body = updates.update_body
);
