# Data Model — planned V1

The following entities are planned for Supabase.

## profiles
- id
- email
- display_name
- created_at
- updated_at

## brands
- id
- owner_id
- name
- description
- primary_language
- locations
- audience
- positioning
- cta_url
- visual_style
- created_at
- updated_at

## topics
- id
- owner_id
- title
- summary
- source_url
- source_name
- published_at
- score
- status
- created_at
- updated_at

## ideas
- id
- owner_id
- title
- notes
- status
- created_at
- updated_at

## posts
- id
- owner_id
- topic_id
- title
- body
- cta
- hashtags
- alt_text
- image_url
- source_url
- status
- scheduled_at
- published_at
- created_at
- updated_at

## integrations
- id
- owner_id
- provider
- status
- metadata
- created_at
- updated_at

Every user-owned table must use Row Level Security so one workspace cannot access another workspace’s data.
