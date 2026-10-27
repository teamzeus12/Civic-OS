-- Civic OS private profile avatar storage.
-- Idempotent because this setup may also be applied directly in an existing project.

alter table public.profiles
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'civic-profile-avatars',
  'civic-profile-avatars',
  false,
  3145728,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='civic_profile_avatar_read_own') then
    create policy civic_profile_avatar_read_own
      on storage.objects for select to authenticated
      using (bucket_id = 'civic-profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='civic_profile_avatar_insert_own') then
    create policy civic_profile_avatar_insert_own
      on storage.objects for insert to authenticated
      with check (bucket_id = 'civic-profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='civic_profile_avatar_update_own') then
    create policy civic_profile_avatar_update_own
      on storage.objects for update to authenticated
      using (bucket_id = 'civic-profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
      with check (bucket_id = 'civic-profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='civic_profile_avatar_delete_own') then
    create policy civic_profile_avatar_delete_own
      on storage.objects for delete to authenticated
      using (bucket_id = 'civic-profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
end $$;
