# Citrus

Citrus ist eine mobile-first Community- und Prioritaetenplattform. Dieses MVP nutzt React, Vite, TypeScript und Supabase.

## Lokal starten

1. Abhaengigkeiten installieren:

```bash
npm install
```

2. `.env.local` anlegen:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-key
```

3. Dev-Server starten:

```bash
npm run dev
```

4. Build pruefen:

```bash
npm run build
```

## Supabase Setup

Fuehre die SQL-Dateien im Supabase SQL Editor in dieser Reihenfolge aus:

1. `supabase/schema.sql`
2. `supabase/storage.sql`
3. `supabase/seed.sql`
4. `supabase/fix_auth_and_read_policies.sql`
5. `supabase/posting_features.sql`
6. `supabase/notifications.sql`
7. `supabase/settings.sql`
8. `supabase/notification_system.sql`
9. Admin-Konto in der App registrieren oder im Dashboard unter Authentication -> Users erstellen
10. `supabase/admin_setup.sql`

Wenn Login, Profilanlage, Posting-Rechte oder oeffentliche Leserechte blockieren, fuehre mindestens diese Fix-Dateien erneut aus:

```text
supabase/fix_auth_and_read_policies.sql
supabase/posting_features.sql
```

Fuer MVP-Tests sollte in Supabase Dashboard unter `Authentication -> Providers -> Email` die Option `Confirm email` ausgeschaltet werden. Sonst erzeugt Supabase zwar den Auth-User, aber die App kann die Session erst nach E-Mail-Bestaetigung nutzen.

Wenn im Login `Email not confirmed` erscheint, ist genau diese Einstellung die Ursache.

Die App verwendet nur den Publishable/Anon Key im Browser. Keinen Service Role Key in Vite, GitHub oder Netlify setzen.

## Admin-Konto

Registriere dich zuerst normal in der App mit:

- Benutzername: `ADMIN`
- E-Mail: `Fcarone@web.de`
- Passwort: `wygher-befzak`

Alternativ kannst du den Auth-User im Supabase Dashboard manuell mit E-Mail und Passwort erstellen. Danach `supabase/admin_setup.sql` im SQL Editor ausfuehren. Der Profil-Tab zeigt dann den Bereich `Verwaltung`.

## Netlify Deploy

GitHub-Repository mit Netlify verbinden und setzen:

- Build Command: `npm run build`
- Publish Directory: `dist`

Environment Variables in Netlify:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Storage

`supabase/storage.sql` und `supabase/posting_features.sql` erstellen den Bucket `movement-media`. Die App komprimiert Bilder clientseitig auf maximal 1600px Breite und nutzt AVIF, wenn der Browser AVIF-Encoding unterstuetzt. Fallback ist WebP. Uploads liegen unter `{user_id}/{timestamp}.avif|webp` und die Storage Policy erlaubt Schreibzugriff nur auf den eigenen User-Pfad.
