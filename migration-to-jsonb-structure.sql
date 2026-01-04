-- Migration Script: Convert flat fields to JSONB structure
-- Run this in Supabase SQL Editor to migrate existing projects
--
-- This migration converts the old flat structure to the new nested JSONB structure:
-- Old: platform, optimization, audience_profile, mood, title_hint, brand_colors, notes, video_path
-- New: content_sources, creative_direction, creator_context, profile_photos (all JSONB/array)

-- Step 1: Add new columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS content_sources JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS creative_direction JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS creator_context JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_photos TEXT[] DEFAULT '{}';

-- Step 2: Migrate existing data from flat fields to JSONB columns
UPDATE projects
SET
  content_sources = jsonb_build_object(
    'video_path', COALESCE(video_path, '')
  ),
  creative_direction = jsonb_build_object(
    'mood', COALESCE(mood, ''),
    'notes', COALESCE(notes, ''),
    'title_hint', COALESCE(title_hint, '')
  ),
  creator_context = jsonb_build_object(
    'maturity_hint', '',
    'niche_hint', COALESCE(
      (SELECT content_niche FROM channel_profiles WHERE channel_profiles.user_id = projects.user_id),
      ''
    )
  )
WHERE
  content_sources = '{}'::jsonb  -- Only update rows that haven't been migrated yet
  OR creative_direction = '{}'::jsonb
  OR creator_context = '{}'::jsonb;

-- Step 3: Drop old columns (OPTIONAL - only run after verifying migration worked)
-- WARNING: This permanently removes the old columns. Backup your data first!
-- Uncomment the lines below when ready to drop old columns:

-- ALTER TABLE projects
--   DROP COLUMN IF EXISTS platform,
--   DROP COLUMN IF EXISTS optimization,
--   DROP COLUMN IF EXISTS audience_profile,
--   DROP COLUMN IF EXISTS mood,
--   DROP COLUMN IF EXISTS title_hint,
--   DROP COLUMN IF EXISTS brand_colors,
--   DROP COLUMN IF EXISTS notes,
--   DROP COLUMN IF EXISTS video_path;

-- Step 4: Verify migration (run this to check the migrated data)
-- SELECT
--   id,
--   name,
--   content_sources,
--   creative_direction,
--   creator_context,
--   profile_photos
-- FROM projects
-- LIMIT 5;
