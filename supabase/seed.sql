insert into public.groups (name, category, scope, icon, description)
select name, category, scope, icon, description
from (values
  ('Stadt Karlsruhe', 'Stadt', 'external', 'K', 'Lokale Themen, die Karlsruhe spürbar besser machen.'),
  ('DHBW Mosbach', 'Universität', 'internal', 'D', 'Campus-Ideen von Studierenden und Teams.'),
  ('Spotify', 'App', 'external', 'S', 'Produktideen rund um Musik, Playlists und Hören unterwegs.'),
  ('WhatsApp', 'App', 'external', 'W', 'Bessere Kommunikation ohne Benachrichtigungsstress.'),
  ('Deutsche Bahn', 'Mobilität', 'external', 'B', 'Verlässlichkeit, Information und Reisen im Alltag.'),
  ('Apple', 'Marke', 'external', 'A', 'Ideen für Produkte, Services und Nutzungserlebnisse.'),
  ('Netflix', 'Marke', 'external', 'N', 'Streaming-Erlebnisse, Profile und Empfehlungen.'),
  ('Firma Muster GmbH', 'Firma', 'internal', 'M', 'Interne Verbesserungen für moderne Zusammenarbeit.'),
  ('FC Musterstadt', 'Verein', 'internal', 'F', 'Sport, Gemeinschaft und Vereinsleben.')
) as seed_groups(name, category, scope, icon, description)
where not exists (
  select 1 from public.groups existing
  where existing.name = seed_groups.name
);

with g as (
  select id, name from public.groups
),
seeded as (
  insert into public.movements (title, description, type, status, group_id, category, created_at)
  select title, description, type, status, group_id, category, created_at
  from (values
    ('Mehr Fahrradwege in der Innenstadt', 'Sichere, durchgehende Radachsen zwischen Marktplatz, Bahnhof und Universität.', 'improvement', 'review', (select id from g where name = 'Stadt Karlsruhe'), 'Mobilität', now() - interval '5 days'),
    ('Bessere Busverbindungen am Abend', 'Spätere Takte für Menschen, die nach Arbeit, Sport oder Kultur sicher nach Hause wollen.', 'problem', 'trending', (select id from g where name = 'Stadt Karlsruhe'), 'Mobilität', now() - interval '4 days'),
    ('Mehr Lernräume auf dem Campus', 'Ruhige, verlässlich buchbare Räume für Prüfungsphasen und Gruppenarbeit.', 'idea', 'submitted', (select id from g where name = 'DHBW Mosbach'), 'Campus', now() - interval '3 days'),
    ('Spotify: Besserer Offline-Modus', 'Downloads sollen transparenter, stabiler und leichter zwischen Geräten nutzbar sein.', 'improvement', 'trending', (select id from g where name = 'Spotify'), 'Produkt', now() - interval '6 days'),
    ('WhatsApp: Mehr Kontrolle über Gruppenbenachrichtigungen', 'Weniger Lärm in großen Gruppen, ohne wichtige Nachrichten zu verpassen.', 'improvement', 'review', (select id from g where name = 'WhatsApp'), 'Kommunikation', now() - interval '2 days'),
    ('Deutsche Bahn: Verlässlichere Infos bei Verspätungen', 'Aktuelle, verständliche Hinweise direkt dort, wo Reisende Entscheidungen treffen.', 'problem', 'review', (select id from g where name = 'Deutsche Bahn'), 'Mobilität', now() - interval '7 days'),
    ('Mehr Bäume in heißen Straßen', 'Schattige Straßenräume für Sommer, Gesundheit und Aufenthaltsqualität.', 'idea', 'trending', (select id from g where name = 'Stadt Karlsruhe'), 'Stadtleben', now() - interval '1 day'),
    ('Neuer Basketballplatz im Viertel', 'Ein frei zugänglicher Court mit Licht, Sitzplätzen und fairer Nutzung für Jugendliche.', 'idea', 'implementation', (select id from g where name = 'FC Musterstadt'), 'Sport', now() - interval '8 days')
  ) as seed_movements(title, description, type, status, group_id, category, created_at)
  where not exists (
    select 1 from public.movements existing
    where existing.title = seed_movements.title
  )
  returning id, title
)
insert into public.movement_updates (movement_id, body, created_at)
select id, 'Das Thema gewinnt diese Woche stark an Unterstützung.', now() - interval '2 days' from seeded
union all
select id, 'Viele Nutzer nennen ähnliche Probleme im gleichen Bereich.', now() - interval '1 day' from seeded
union all
select id, 'Die Bewegung wurde zur Prüfung markiert.', now() from seeded where title in ('Mehr Fahrradwege in der Innenstadt', 'WhatsApp: Mehr Kontrolle über Gruppenbenachrichtigungen', 'Deutsche Bahn: Verlässlichere Infos bei Verspätungen');

insert into public.supports (movement_id, user_id, created_at)
select m.id, null, now() - (interval '1 day' * (support_index % 10))
from public.movements m
join lateral generate_series(
  1,
  case
    when m.title = 'Spotify: Besserer Offline-Modus' then 96
    when m.title = 'Mehr Fahrradwege in der Innenstadt' then 84
    when m.title = 'WhatsApp: Mehr Kontrolle über Gruppenbenachrichtigungen' then 73
    when m.title = 'Deutsche Bahn: Verlässlichere Infos bei Verspätungen' then 68
    when m.title = 'Mehr Bäume in heißen Straßen' then 61
    when m.title = 'Bessere Busverbindungen am Abend' then 44
    when m.title = 'Neuer Basketballplatz im Viertel' then 38
    else 26
  end
) as support_index on true
where not exists (
  select 1 from public.supports existing
  where existing.movement_id = m.id
);
