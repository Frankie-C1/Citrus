# Citrus

Citrus ist eine mobile-first Community- und Prioritätenplattform. Dieses MVP nutzt React, Vite, TypeScript und Supabase.

## Lokal starten

1. Abhängigkeiten installieren:

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

4. Build prüfen:

```bash
npm run build
```

## Supabase Setup

Führe zuerst `supabase/schema.sql` im Supabase SQL Editor aus. Danach `supabase/seed.sql`, um Gruppen, Bewegungen, Updates und erste öffentliche Support-Zählungen einzuspielen.

Die App verwendet nur den Publishable/Anon Key im Browser. Keinen Service Role Key in Vite, GitHub oder Netlify setzen.

## Netlify Environment Variables

Für GitHub/Netlify müssen diese Variablen im Netlify Site Dashboard gesetzt werden:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Build Command:

```bash
npm run build
```

Publish Directory:

```text
dist
```
