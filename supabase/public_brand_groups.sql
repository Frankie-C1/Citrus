insert into public.groups (id, name, scope, category, members, accent, icon, description)
values
  ('chatgpt', 'ChatGPT', 'external', 'App', 302411, '#10A37F', '✳', 'Feedback, Ideen und Probleme rund um ChatGPT.'),
  ('citrus', 'Citrus', 'external', 'App', 12847, '#FFCC00', '✦', 'Feedback, Ideen und Verbesserungen für Citrus.'),
  ('spotify', 'Spotify', 'external', 'App', 134901, '#1DB954', '≋', 'Musik, Podcasts und App-Erlebnis.'),
  ('whatsapp', 'WhatsApp', 'external', 'Produkt', 218421, '#25D366', '☎', 'Messenger, Gruppen und Alltagserlebnis.')
on conflict (id) do update set
  name = excluded.name,
  scope = excluded.scope,
  category = excluded.category,
  members = excluded.members,
  accent = excluded.accent,
  icon = excluded.icon,
  description = excluded.description;
