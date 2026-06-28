-- WC 2026 Predictions — database schema
-- Run this in the Supabase SQL editor (https://supabase.com/dashboard → SQL).

-- ───────────────────────────── Tables ─────────────────────────────

create table if not exists public.teams (
  id   text primary key,
  name text not null,
  flag text not null default '🏳️'
);

create table if not exists public.matches (
  slot        text primary key,
  stage       text not null,
  ord         int  not null default 0,
  home_team   text references public.teams (id),
  away_team   text references public.teams (id),
  home_score  int,
  away_score  int,
  status      text not null default 'SCHEDULED',
  winner_team text references public.teams (id),
  kickoff     timestamptz
);

create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  nick               text not null,
  avatar_url         text,
  predictions_locked boolean not null default false,
  created_at         timestamptz not null default now()
);

-- Idempotent column adds for existing databases.
alter table public.profiles
  add column if not exists avatar_url text;
alter table public.profiles
  add column if not exists predictions_locked boolean not null default false;

create table if not exists public.predictions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  match_slot       text not null references public.matches (slot) on delete cascade,
  predicted_winner text not null references public.teams (id),
  updated_at       timestamptz not null default now(),
  unique (user_id, match_slot)
);

create index if not exists predictions_user_idx on public.predictions (user_id);

-- ─────────────────────────── Row Level Security ───────────────────────────

alter table public.teams       enable row level security;
alter table public.matches     enable row level security;
alter table public.profiles    enable row level security;
alter table public.predictions enable row level security;

-- Public read access (bracket + leaderboard are visible to everyone).
drop policy if exists "teams_read" on public.teams;
create policy "teams_read" on public.teams for select using (true);

drop policy if exists "matches_read" on public.matches;
create policy "matches_read" on public.matches for select using (true);

drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);

drop policy if exists "predictions_read" on public.predictions;
create policy "predictions_read" on public.predictions for select using (true);

-- Users manage their own profile.
drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Users manage only their own predictions — and only while their bracket is
-- still unlocked (the lock is the server-side guarantee behind "Zatwierdź typy").
drop policy if exists "predictions_insert_own" on public.predictions;
create policy "predictions_insert_own" on public.predictions
  for insert with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.predictions_locked
    )
  );
drop policy if exists "predictions_update_own" on public.predictions;
create policy "predictions_update_own" on public.predictions
  for update using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.predictions_locked
    )
  );
drop policy if exists "predictions_delete_own" on public.predictions;
create policy "predictions_delete_own" on public.predictions
  for delete using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.predictions_locked
    )
  );

-- ──────────── Match-of-the-day predictions (independent ranking) ────────────

create table if not exists public.match_predictions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  match_slot       text not null references public.matches (slot) on delete cascade,
  predicted_winner text not null references public.teams (id),
  updated_at       timestamptz not null default now(),
  unique (user_id, match_slot)
);

create index if not exists match_predictions_user_idx on public.match_predictions (user_id);
create index if not exists match_predictions_slot_idx on public.match_predictions (match_slot);

alter table public.match_predictions enable row level security;

drop policy if exists "match_predictions_read" on public.match_predictions;
create policy "match_predictions_read" on public.match_predictions for select using (true);

-- Picks are only allowed before kickoff: match still SCHEDULED *and* its
-- kickoff is unknown or still in the future.
drop policy if exists "match_predictions_insert_own" on public.match_predictions;
create policy "match_predictions_insert_own" on public.match_predictions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.slot = match_slot
        and m.status = 'SCHEDULED'
        and (m.kickoff is null or m.kickoff > now())
    )
  );

drop policy if exists "match_predictions_update_own" on public.match_predictions;
create policy "match_predictions_update_own" on public.match_predictions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    exists (
      select 1 from public.matches m
      where m.slot = match_slot
        and m.status = 'SCHEDULED'
        and (m.kickoff is null or m.kickoff > now())
    )
  );

drop policy if exists "match_predictions_delete_own" on public.match_predictions;
create policy "match_predictions_delete_own" on public.match_predictions
  for delete to authenticated using (auth.uid() = user_id);

-- ──────────────────── Auto-create a profile on signup ────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nick)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nick', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────── Lock is one-way: players can't revert it to keep cheating ─────────
-- Service-role/postgres (admin resets) bypass this; only authenticated users are blocked.
create or replace function public.prevent_predictions_unlock()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated'
     and old.predictions_locked = true
     and new.predictions_locked = false then
    raise exception 'predictions_locked cannot be reverted';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_unlock on public.profiles;
create trigger profiles_prevent_unlock
  before update on public.profiles
  for each row execute function public.prevent_predictions_unlock();

-- ──────────────────────── Realtime for live results ────────────────────────

do $$
begin
  alter publication supabase_realtime add table public.matches;
exception
  when duplicate_object then null;
end;
$$;

-- ──────────────────────── Storage: avatars ('profile' bucket) ────────────────────────

insert into storage.buckets (id, name, public)
values ('profile', 'profile', true)
on conflict (id) do update set public = true;

-- Public read of avatars.
drop policy if exists "profile_avatars_read" on storage.objects;
create policy "profile_avatars_read" on storage.objects
  for select using (bucket_id = 'profile');

-- Authenticated users manage only files inside their own user-id folder.
drop policy if exists "profile_avatars_insert_own" on storage.objects;
create policy "profile_avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_avatars_update_own" on storage.objects;
create policy "profile_avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_avatars_delete_own" on storage.objects;
create policy "profile_avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
