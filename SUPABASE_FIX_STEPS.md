# Supabase Fix Steps

1. Env Vars pruefen: `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` muessen lokal in `.env.local` und bei Netlify als Environment Variables gesetzt sein.
2. Confirm Email ausschalten: Supabase Dashboard -> Authentication -> Providers -> Email -> Confirm email ausschalten.
3. `supabase/fix_auth_and_read_policies.sql` im Supabase SQL Editor ausfuehren.
4. `supabase/posting_features.sql` ausfuehren, damit Beitraege bearbeiten/loeschen, Gruppen verlassen und Bild-Uploads funktionieren.
5. Admin-User im Dashboard erstellen oder in der App registrieren.
6. `supabase/admin_setup.sql` im Supabase SQL Editor ausfuehren.
7. App neu starten.
