-- ========================================
-- SUPABASE DIAGNOSTIC QUERIES
-- Run these in Supabase SQL Editor to diagnose project loading issues
-- ========================================

-- 1. CHECK IF PROJECTS TABLE EXISTS
-- Should return 1 if table exists
SELECT COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_name = 'projects';

-- 2. CHECK TABLE SCHEMA
-- Shows all columns and their types
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- 3. CHECK IF RLS IS ENABLED
-- Should return 'true' if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'projects';

-- 4. LIST ALL RLS POLICIES
-- Shows what policies exist and their definitions
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies
WHERE tablename = 'projects';

-- 5. COUNT ALL PROJECTS (AS SUPERUSER)
-- This bypasses RLS to show total projects in table
-- Run this to see if projects exist at all
SELECT COUNT(*) as total_projects
FROM projects;

-- 6. LIST ALL PROJECTS WITH USER IDS (AS SUPERUSER)
-- Shows first 10 projects with their user_ids
-- This bypasses RLS
SELECT
    id,
    name,
    user_id,
    created_at,
    updated_at
FROM projects
ORDER BY created_at DESC
LIMIT 10;

-- 7. CHECK YOUR CURRENT USER ID
-- Returns your current authenticated user ID
SELECT auth.uid() as my_user_id;

-- 8. COUNT PROJECTS FOR YOUR USER (WITH RLS)
-- This applies RLS policies - should match what the app sees
SELECT COUNT(*) as my_projects_count
FROM projects
WHERE user_id = auth.uid();

-- 9. LIST YOUR PROJECTS (WITH RLS)
-- This applies RLS policies - should match what the app sees
SELECT
    id,
    name,
    user_id,
    created_at,
    updated_at,
    creative_direction,
    creator_context,
    content_sources
FROM projects
WHERE user_id = auth.uid()
ORDER BY updated_at DESC;

-- 10. CHECK IF user_id MATCHES auth.uid()
-- Compares stored user_ids with current auth user
SELECT
    COUNT(*) as total_projects,
    COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as matching_user_id,
    COUNT(CASE WHEN user_id != auth.uid() THEN 1 END) as different_user_id
FROM projects;

-- ========================================
-- DIAGNOSTIC INTERPRETATION
-- ========================================

-- If Query 5 shows projects but Query 8 shows 0:
--    → RLS is blocking access, need to add/fix policies

-- If Query 6 shows projects with different user_ids than Query 7:
--    → Projects were created with wrong user_id

-- If Query 4 shows no policies:
--    → Need to create RLS policies

-- If Query 1 returns 0:
--    → Table doesn't exist, need to create it

-- ========================================
-- FIXES
-- ========================================

-- FIX 1: Create RLS policies (if Query 4 shows none or incomplete)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Create new policies
CREATE POLICY "Users can read own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (auth.uid() = user_id);

-- FIX 2: If user_ids are wrong, update them (DANGEROUS - BE CAREFUL)
-- Only run this if you're sure all projects in the table are yours
-- Uncomment and modify only if needed:
-- UPDATE projects SET user_id = auth.uid() WHERE user_id IS NOT NULL;

-- FIX 3: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content_sources JSONB DEFAULT '{}'::jsonb,
    creative_direction JSONB DEFAULT '{}'::jsonb,
    creator_context JSONB DEFAULT '{}'::jsonb,
    profile_photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at DESC);

-- ========================================
-- AFTER RUNNING FIXES, RE-RUN QUERY 8 and 9
-- ========================================
