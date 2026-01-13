# ClickMoment Debugging Guide

## Overview
This guide helps diagnose and fix issues with Supabase integration, particularly:
1. **Projects not loading** from the database
2. **Create/Edit project forms not saving** data

## What I've Added

### 1. Comprehensive Logging
I've added detailed console logging throughout the codebase with emoji prefixes for easy scanning:

- 🔧 Configuration/Setup
- ✅ Success operations
- ❌ Errors
- 🔍 Fetching data
- 📦 Data payloads
- 📝 Form submissions
- ✏️ Edit operations
- 🚀 API calls

### 2. Files Modified

**supabase.js**
- Logs Supabase configuration on load
- Shows if URL and key are properly set

**projects.js**
- `getProjects()`: Detailed logging of query execution and errors
- `createProject()`: Logs insert data and full error details
- `updateProject()`: Logs update data and full error details

**main.js**
- `updateUI()`: Logs authentication state and manager initialization
- `renderProjectsList()`: Logs project fetching and rendering
- `showEditProjectView()`: Logs project data loading for editing
- `createProjectForm.submit`: Logs form data collection and submission
- `editProjectForm.submit`: Logs form data and update process

### 3. Bug Fixed
- Line 1624: Fixed `currentProject.id` → `currentProjectId`

## Debugging Steps

### Step 1: Check Browser Console

1. Open your browser's developer tools (F12 or Cmd+Option+I on Mac)
2. Go to the Console tab
3. Reload the page
4. Log in to your app

### Step 2: Look for These Log Messages

**On Page Load:**
```
🔧 Supabase configuration:
  url: https://...
  key: ***hidden***
```
✅ **Expected**: URL should show your Supabase project URL
❌ **Problem**: If "NOT SET" appears, environment variables aren't configured

**On Login:**
```
🔄 updateUI called, currentUser: <user-id>
✅ User authenticated:
  id: <user-id>
  email: <email>
  created_at: <timestamp>
📦 Initializing ProjectManager with userId: <user-id>
📦 Initializing ProfileManager
```

**When Loading Projects:**
```
📋 renderProjectsList called
🔍 Fetching projects from Supabase...
🔍 ProjectManager.getProjects() called with userId: <user-id>
✅ Projects loaded successfully: X projects
```

### Step 3: Check for Errors

If you see any of these error patterns, follow the solutions below:

#### Error Pattern 1: Permission Denied / Row Level Security
```
❌ Error loading projects:
  message: "new row violates row-level security policy"
  code: "42501"
```

**Solution**: Add RLS policies (see SQL section below)

#### Error Pattern 2: Column Does Not Exist
```
❌ Error creating project:
  message: "column 'profile_photos' does not exist"
  code: "42703"
```

**Solution**: Update your database schema (see SQL section below)

#### Error Pattern 3: JSONB Type Mismatch
```
❌ Error updating project:
  message: "column 'creative_direction' is of type jsonb but expression is of type text"
```

**Solution**: Your database column types need to be JSONB (see SQL section below)

## SQL Fixes for Supabase

### 1. Check Your Table Schema

Run this in Supabase SQL Editor to check current schema:

```sql
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;
```

### 2. Expected Schema

Your `projects` table should have these columns:

```sql
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
```

### 3. Add Missing Columns (if needed)

If you're missing any columns, add them:

```sql
-- Add content_sources if missing
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS content_sources JSONB DEFAULT '{}'::jsonb;

-- Add creative_direction if missing
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS creative_direction JSONB DEFAULT '{}'::jsonb;

-- Add creator_context if missing
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS creator_context JSONB DEFAULT '{}'::jsonb;

-- Add profile_photos if missing
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS profile_photos JSONB DEFAULT '[]'::jsonb;
```

### 4. Fix Column Types (if they're TEXT instead of JSONB)

```sql
-- Only run if columns exist but are wrong type
ALTER TABLE projects
ALTER COLUMN content_sources TYPE JSONB USING content_sources::jsonb;

ALTER TABLE projects
ALTER COLUMN creative_direction TYPE JSONB USING creative_direction::jsonb;

ALTER TABLE projects
ALTER COLUMN creator_context TYPE JSONB USING creator_context::jsonb;

ALTER TABLE projects
ALTER COLUMN profile_photos TYPE JSONB USING profile_photos::jsonb;
```

### 5. Enable Row Level Security (RLS)

```sql
-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Create policies
CREATE POLICY "Users can read own projects"
ON projects
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
ON projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
ON projects
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
ON projects
FOR DELETE
USING (auth.uid() = user_id);
```

### 6. Fix Analyses Table (if it exists)

```sql
-- Enable RLS on analyses table
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own analyses" ON analyses;
DROP POLICY IF EXISTS "Users can create own analyses" ON analyses;

-- Allow users to read analyses for their projects
CREATE POLICY "Users can read own analyses"
ON analyses
FOR SELECT
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

-- Allow users to create analyses for their projects
CREATE POLICY "Users can create own analyses"
ON analyses
FOR INSERT
WITH CHECK (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);
```

### 7. Create Updated_At Trigger (Optional but Recommended)

```sql
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Environment Variables Check

Make sure these are set in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
API_BASE_URL=https://your-backend.run.app
```

Alternative variable names (the build script checks all of these):
- `EXPO_PUBLIC_SUPABASE_URL` (instead of SUPABASE_URL)
- `EXPO_PUBLIC_SUPABASE_KEY` (instead of SUPABASE_ANON_KEY)
- `EXPO_PUBLIC_API_BASE_URL` (instead of API_BASE_URL)

After adding/changing variables, redeploy your app.

## Testing Checklist

After making the SQL changes, test in this order:

### 1. Test Authentication
- [ ] Log in with Google
- [ ] Check console shows: `✅ User authenticated`
- [ ] Check console shows: `📦 Initializing ProjectManager`

### 2. Test Loading Projects
- [ ] Console shows: `🔍 Fetching projects from Supabase...`
- [ ] Console shows: `✅ Projects loaded successfully: X projects`
- [ ] Projects list displays (or "No projects" message if empty)

### 3. Test Creating Project
- [ ] Click "New Project" button
- [ ] Fill in form fields:
  - Project Name (required)
  - Mood (optional)
  - Title Hint (optional)
  - Notes (optional)
  - Channel Maturity (optional)
  - Content Niche (optional)
- [ ] Click "Create Project"
- [ ] Console shows: `📝 Create project form submitted`
- [ ] Console shows: `✅ Project created successfully`
- [ ] Redirects to project detail view
- [ ] Back to projects list shows the new project

### 4. Test Editing Project
- [ ] Open an existing project
- [ ] Click "Edit Project" button
- [ ] Console shows: `✏️ showEditProjectView called`
- [ ] Console shows: `✅ Project data loaded`
- [ ] Console shows: `📋 Edit form populated with project data`
- [ ] Verify form fields are pre-filled with existing data
- [ ] Modify some fields
- [ ] Click "Save Changes"
- [ ] Console shows: `✏️ Edit project form submitted`
- [ ] Console shows: `✅ Project updated successfully`
- [ ] Redirects back to project detail view
- [ ] Verify changes are saved

### 5. Test Button Handlers
All these buttons should work:

**Projects List View:**
- [ ] "+ New Project" button
- [ ] "Open Project" button (on each project card)
- [ ] "Delete" button (on each project card)

**Create Project View:**
- [ ] "← Back to Projects" button (top)
- [ ] "Cancel" button (bottom)
- [ ] "Create Project" button (submit)

**Edit Project View:**
- [ ] "← Back to Project" button (top)
- [ ] "Cancel" button (bottom)
- [ ] "Save Changes" button (submit)

**Project Detail View:**
- [ ] "← Back to Projects" button
- [ ] "Edit Project" button

## Common Issues & Solutions

### Issue: "Projects not loading"
**Symptoms**: Blank projects list, no console errors
**Solution**: Check RLS policies (Step 5 in SQL section)

### Issue: "Cannot create project"
**Symptoms**: Error message when submitting form
**Solutions**:
1. Check RLS policies (Step 5)
2. Check schema matches expected (Step 2)
3. Check console for specific error code

### Issue: "Cannot save edits"
**Symptoms**: Edit form submits but changes don't persist
**Solutions**:
1. Check RLS UPDATE policy exists (Step 5)
2. Check JSONB column types (Step 4)
3. Check console logs for error details

### Issue: "Environment variables not set"
**Symptoms**: Red error box on page, or console shows "NOT SET"
**Solution**:
1. Add variables in Vercel dashboard
2. Redeploy the application
3. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

## Getting More Help

If you still have issues after following this guide:

1. **Share console output**: Copy all console logs (especially lines with ❌)
2. **Share specific error messages**: Include error code and message
3. **Share what you've tried**: Which SQL queries you ran
4. **Share current state**: Can you log in? Can you see projects? What breaks?

## Quick Reference: Console Log Meanings

| Emoji | Meaning | Type |
|-------|---------|------|
| 🔧 | Configuration/setup info | Info |
| ✅ | Success! Operation completed | Success |
| ❌ | Error occurred | Error |
| 🔍 | Searching/fetching data | Info |
| 📦 | Data payload/object | Info |
| 📝 | Form submission | Info |
| ✏️ | Edit operation | Info |
| 🚀 | API call starting | Info |
| ℹ️ | Informational message | Info |

---

**Last Updated**: 2026-01-12
**Version**: 1.0
