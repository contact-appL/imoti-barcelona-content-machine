-- Add social profile URLs to each user's private brand.
alter table public.brands add column if not exists facebook_url text;
alter table public.brands add column if not exists tiktok_url text;
