insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'movement-media',
  'movement-media',
  true,
  3145728,
  array['image/avif', 'image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists movement_media_public_read on storage.objects;
create policy movement_media_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'movement-media');

drop policy if exists movement_media_authenticated_upload on storage.objects;
create policy movement_media_authenticated_upload
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'movement-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists movement_media_owner_update on storage.objects;
create policy movement_media_owner_update
on storage.objects for update
to authenticated
using (bucket_id = 'movement-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'movement-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists movement_media_owner_delete on storage.objects;
create policy movement_media_owner_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'movement-media' and (storage.foldername(name))[1] = auth.uid()::text);
