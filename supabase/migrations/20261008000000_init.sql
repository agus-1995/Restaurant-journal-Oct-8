-- Mi Diario: initial schema.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is idempotent where practical, so running it twice is safe.
--
-- Security model: every row belongs to one user (`user_id`) and row-level security lets a user
-- see and change only their own rows. The app signs users in anonymously (no login screen yet),
-- so each browser is its own user. Enable it under Authentication -> Sign In / Providers ->
-- "Allow anonymous sign-ins".

-- ---------------------------------------------------------------- tables

create table if not exists public.places (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) > 0),
  neighborhood text,
  city         text not null check (char_length(btrim(city)) > 0),
  type         text not null default 'restaurant'
               check (type in ('restaurant', 'winery', 'cafe', 'street_food', 'bar', 'other')),
  status       text not null default 'open' check (status in ('open', 'closed', 'unknown')),
  address      text,
  maps_url     text,
  created_at   timestamptz not null default now()
);

create table if not exists public.entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- RESTRICT: a place that still has entries cannot be deleted (the app reports "conflict").
  place_id     uuid not null references public.places (id) on delete restrict,
  date         date not null,
  photos       text[] not null default '{}',
  dishes       jsonb not null default '[]' check (jsonb_typeof(dishes) = 'array'),
  price_tier   smallint check (price_tier between 1 and 3),
  reaction     text not null check (reaction in ('loved', 'good', 'meh')),
  is_unusual   boolean not null default false,
  occasion     text check (occasion in ('solo', 'friends', 'date', 'family', 'work')),
  cuisine_tags text[] not null default '{}',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id  uuid not null references public.places (id) on delete restrict,
  note      text,
  source    text,
  added_at  timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  last_occasion   text check (last_occasion in ('solo', 'friends', 'date', 'family', 'work')),
  last_city       text,
  onboarding_seen boolean not null default false
);

create index if not exists entries_user_date_idx on public.entries (user_id, date desc, created_at desc);
create index if not exists entries_place_idx on public.entries (place_id);
create index if not exists wishlist_user_added_idx on public.wishlist_items (user_id, added_at desc);
create index if not exists wishlist_place_idx on public.wishlist_items (place_id);
create index if not exists places_user_idx on public.places (user_id);

-- ---------------------------------------------------------------- updated_at

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- row-level security

alter table public.places           enable row level security;
alter table public.entries          enable row level security;
alter table public.wishlist_items   enable row level security;
alter table public.user_preferences enable row level security;

-- places: own rows only
drop policy if exists "places: own rows" on public.places;
create policy "places: own rows" on public.places
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- entries / wishlist: own rows only, AND they may only point at one of the user's own places
-- (otherwise a user could attach an entry to someone else's place if they guessed its id).
drop policy if exists "entries: own rows" on public.entries;
create policy "entries: own rows" on public.entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.places p where p.id = place_id and p.user_id = (select auth.uid()))
  );

drop policy if exists "wishlist: own rows" on public.wishlist_items;
create policy "wishlist: own rows" on public.wishlist_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.places p where p.id = place_id and p.user_id = (select auth.uid()))
  );

drop policy if exists "preferences: own row" on public.user_preferences;
create policy "preferences: own row" on public.user_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Nothing is readable or writable without signing in.
revoke all on public.places, public.entries, public.wishlist_items, public.user_preferences from anon;

-- ---------------------------------------------------------------- photo storage

-- Public bucket: photo URLs contain an unguessable UUID and are stored in the entry, so the
-- <img> tags (and the share-card canvas) can load them without signed URLs. Only the owner can
-- upload or delete, and only inside a folder named after their user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('entry-photos', 'entry-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage must be able to SEE a file in order to list or delete it. Own folder only: nobody can see
-- anyone else's files through the API (public URLs still work for <img> because the bucket is public).
drop policy if exists "entry-photos: read own files" on storage.objects;
create policy "entry-photos: read own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'entry-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "entry-photos: upload to own folder" on storage.objects;
create policy "entry-photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'entry-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "entry-photos: update own files" on storage.objects;
create policy "entry-photos: update own files" on storage.objects
  for update to authenticated
  using (bucket_id = 'entry-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "entry-photos: delete own files" on storage.objects;
create policy "entry-photos: delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'entry-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
