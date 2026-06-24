insert into public.groups (name, category, scope, icon, description, invite_code)
select name, category, scope, icon, description, invite_code
from (values
  ('Stadt Karlsruhe', 'Stadt', 'external', 'KA', 'Lokale Themen, die Karlsruhe spürbar besser machen.', null),
  ('DHBW Mosbach', 'Universität', 'internal', 'DH', 'Campus-Ideen von Studierenden und Teams.', 'DHBW5'),
  ('Firma Muster GmbH', 'Firma', 'internal', 'MG', 'Interne Verbesserungen für moderne Zusammenarbeit.', 'MSTR5'),
  ('FC Musterstadt', 'Verein', 'internal', 'FC', 'Sport, Gemeinschaft und Vereinsleben.', 'FC123'),
  ('WhatsApp', 'App', 'external', 'WA', 'Bessere Kommunikation ohne Benachrichtigungsstress.', null),
  ('Snapchat', 'App', 'external', 'SC', 'Kreative Kommunikation und kleine Alltagsmomente.', null),
  ('Instagram', 'App', 'external', 'IG', 'Ideen für Reels, Profile, Creator und Community.', null),
  ('TikTok', 'App', 'external', 'TT', 'Kurzvideo-Erlebnisse, Sicherheit und Empfehlungen.', null),
  ('YouTube', 'App', 'external', 'YT', 'Video, Creator, Kommentare und Empfehlungen.', null),
  ('Spotify', 'App', 'external', 'SP', 'Produktideen rund um Musik, Playlists und Hören unterwegs.', null),
  ('Apple Music', 'App', 'external', 'AM', 'Musik, Bibliothek, Empfehlungen und Offline-Nutzung.', null),
  ('Netflix', 'Marke', 'external', 'NF', 'Streaming-Erlebnisse, Profile und Empfehlungen.', null),
  ('Amazon', 'Marke', 'external', 'AZ', 'Shopping, Lieferung, Retouren und Prime-Erlebnisse.', null),
  ('Apple', 'Marke', 'external', 'AP', 'Ideen für Produkte, Services und Nutzungserlebnisse.', null),
  ('Google', 'Marke', 'external', 'GO', 'Suche, Maps, Android und digitale Dienste.', null),
  ('Microsoft', 'Marke', 'external', 'MS', 'Produktivität, Windows, Teams und Cloud-Erlebnisse.', null),
  ('Discord', 'App', 'external', 'DC', 'Server, Communities, Voice und Moderation.', null),
  ('Telegram', 'App', 'external', 'TG', 'Messaging, Kanäle und Datenschutz-Erwartungen.', null),
  ('X', 'App', 'external', 'X', 'Öffentliche Debatten, Trends und Creator-Funktionen.', null),
  ('Reddit', 'App', 'external', 'RD', 'Communities, Moderation und Diskussionen.', null),
  ('Twitch', 'App', 'external', 'TW', 'Live-Streaming, Chat und Creator-Werkzeuge.', null),
  ('Deutsche Bahn', 'Mobilität', 'external', 'DB', 'Verlässlichkeit, Information und Reisen im Alltag.', null),
  ('DHL', 'Logistik', 'external', 'DL', 'Pakettracking, Zustellung und Servicepunkte.', null),
  ('McDonald''s', 'Marke', 'external', 'MC', 'Restaurant-Erlebnis, App, Bestellung und Nachhaltigkeit.', null),
  ('Burger King', 'Marke', 'external', 'BK', 'Restaurant-Erlebnis, App-Angebote und Service.', null),
  ('Nike', 'Marke', 'external', 'NK', 'Produkte, Stores, Community und Sporterlebnisse.', null),
  ('Adidas', 'Marke', 'external', 'AD', 'Produkte, Nachhaltigkeit und Sport-Community.', null),
  ('H&M', 'Marke', 'external', 'HM', 'Mode, Filialen, App und nachhaltigere Kreisläufe.', null),
  ('Zara', 'Marke', 'external', 'ZA', 'Mode, Verfügbarkeit, Retouren und Einkaufserlebnis.', null)
) as seed_groups(name, category, scope, icon, description, invite_code)
where not exists (
  select 1 from public.groups existing
  where existing.name = seed_groups.name
);

with g as (
  select id, name from public.groups
)
insert into public.movements (title, description, type, status, group_id, scope, category, emoji, created_at)
select title, description, type, status, group_id, scope, category, emoji, created_at
from (values
  ('Mehr Fahrradwege in der Innenstadt', 'Sichere, durchgehende Radachsen zwischen Marktplatz, Bahnhof und Universität.', 'improvement', 'review', (select id from g where name = 'Stadt Karlsruhe'), 'external', 'Mobilität', '🚲', now() - interval '5 days'),
  ('Bessere Busverbindungen am Abend', 'Spätere Takte für Menschen, die nach Arbeit, Sport oder Kultur sicher nach Hause wollen.', 'problem', 'trending', (select id from g where name = 'Stadt Karlsruhe'), 'external', 'Mobilität', '🚌', now() - interval '4 days'),
  ('Mehr Lernräume auf dem Campus', 'Ruhige, verlässlich buchbare Räume für Prüfungsphasen und Gruppenarbeit.', 'idea', 'submitted', (select id from g where name = 'DHBW Mosbach'), 'internal', 'Campus', '📚', now() - interval '3 days'),
  ('Spotify: Besserer Offline-Modus', 'Downloads sollen transparenter, stabiler und leichter zwischen Geräten nutzbar sein.', 'improvement', 'trending', (select id from g where name = 'Spotify'), 'external', 'Produkt', '🎧', now() - interval '6 days'),
  ('WhatsApp: Mehr Kontrolle über Gruppenbenachrichtigungen', 'Weniger Lärm in großen Gruppen, ohne wichtige Nachrichten zu verpassen.', 'improvement', 'review', (select id from g where name = 'WhatsApp'), 'external', 'Kommunikation', '💬', now() - interval '2 days'),
  ('Deutsche Bahn: Verlässlichere Infos bei Verspätungen', 'Aktuelle, verständliche Hinweise direkt dort, wo Reisende Entscheidungen treffen.', 'problem', 'review', (select id from g where name = 'Deutsche Bahn'), 'external', 'Mobilität', '🚆', now() - interval '7 days'),
  ('Mehr Bäume in heißen Straßen', 'Schattige Straßenräume für Sommer, Gesundheit und Aufenthaltsqualität.', 'idea', 'trending', (select id from g where name = 'Stadt Karlsruhe'), 'external', 'Stadtleben', '🌳', now() - interval '1 day'),
  ('Neuer Basketballplatz im Viertel', 'Ein frei zugänglicher Court mit Licht, Sitzplätzen und fairer Nutzung für Jugendliche.', 'idea', 'implementation', (select id from g where name = 'FC Musterstadt'), 'internal', 'Sport', '🏀', now() - interval '8 days')
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
  'Mehr Fahrradwege in der Innenstadt',
  'Spotify: Besserer Offline-Modus',
  'WhatsApp: Mehr Kontrolle über Gruppenbenachrichtigungen',
  'Deutsche Bahn: Verlässlichere Infos bei Verspätungen',
  'Mehr Bäume in heißen Straßen'
)
and not exists (
  select 1 from public.movement_updates existing
  where existing.movement_id = m.id
  and existing.body = updates.update_body
);
