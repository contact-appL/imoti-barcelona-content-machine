-- Initial Supabase schema for Imoti Barcelona Content Machine
-- Run this file in Supabase SQL Editor after the project is created.
-- No service-role key or secrets are stored here.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  positioning text,
  primary_language text not null default 'bg',
  country text default 'Spain',
  regions text[] default '{}',
  audiences text[] default '{}',
  content_pillars text[] default '{}',
  visual_style text,
  default_cta text,
  whatsapp_url text,
  instagram_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text,
  source_type text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  title text not null,
  summary text,
  source_url text,
  published_at timestamptz,
  relevance_score numeric(5,2),
  freshness_score numeric(5,2),
  client_potential_score numeric(5,2),
  credibility_score numeric(5,2),
  novelty_score numeric(5,2),
  status text not null default 'inbox'
    check (status in ('inbox','approved','saved','rejected','used')),
  is_manual boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  title text,
  body text,
  cta text,
  hashtags text[] default '{}',
  alt_text text,
  source_url text,
  image_url text,
  status text not null default 'draft'
    check (status in ('draft','ready','sending','scheduled','published','error')),
  scheduled_at timestamptz,
  published_at timestamptz,
  meta_status text,
  meta_post_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_channels (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  channel text not null check (channel in ('facebook','instagram')),
  status text not null default 'pending'
    check (status in ('pending','sending','scheduled','published','error')),
  external_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(post_id, channel)
);

create table if not exists public.manual_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  title text not null,
  notes text,
  status text not null default 'new'
    check (status in ('new','approved','used','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  posting_frequency integer not null default 4,
  preferred_posting_times text[] default '{}',
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brands_user_id_idx on public.brands(user_id);
create index if not exists sources_user_id_idx on public.sources(user_id);
create index if not exists topics_user_id_idx on public.topics(user_id);
create index if not exists topics_status_idx on public.topics(status);
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_status_idx on public.posts(status);
create index if not exists posts_scheduled_at_idx on public.posts(scheduled_at);
create index if not exists post_channels_post_id_idx on public.post_channels(post_id);
create index if not exists manual_ideas_user_id_idx on public.manual_ideas(user_id);

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.sources enable row level security;
alter table public.topics enable row level security;
alter table public.posts enable row level security;
alter table public.post_channels enable row level security;
alter table public.manual_ideas enable row level security;
alter table public.settings enable row level security;

create policy "profiles_own" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "brands_own" on public.brands
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "sources_own" on public.sources
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "topics_own" on public.topics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "posts_own" on public.posts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "manual_ideas_own" on public.manual_ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "settings_own" on public.settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "post_channels_own" on public.post_channels
  for all using (
    exists (
      select 1 from public.posts p
      where p.id = post_channels.post_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_channels.post_id
        and p.user_id = auth.uid()
    )
  );

-- Automatically create a profile and default settings for every new authenticated user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;

  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed the initial Imoti Barcelona brand only when the authenticated user first creates it.
-- The actual per-user seed is handled by the application so no shared data is created here.
