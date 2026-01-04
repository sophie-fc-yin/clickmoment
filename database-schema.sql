-- Supabase Database Schema for ClickMoment
-- Run this in Supabase SQL Editor to create the required tables

-- Channel Profiles table (one per user)
CREATE TABLE IF NOT EXISTS channel_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stage TEXT CHECK (char_length(stage) <= 50),
    subscriber_count INTEGER CHECK (subscriber_count >= 0),
    content_niche TEXT CHECK (char_length(content_niche) <= 100),
    upload_frequency TEXT CHECK (char_length(upload_frequency) <= 50),
    growth_goal TEXT CHECK (char_length(growth_goal) <= 100),
    
    -- Usage tracking
    analyses_used INTEGER DEFAULT 0 CHECK (analyses_used >= 0),
    is_tester BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,

    -- Video content (JSONB: {video_path: "gs://..."})
    content_sources JSONB DEFAULT '{}'::jsonb,

    -- Creative direction (JSONB: {mood: "...", notes: "...", title_hint: "..."})
    creative_direction JSONB DEFAULT '{}'::jsonb,

    -- Creator context (JSONB: {maturity_hint: "...", niche_hint: "..."})
    creator_context JSONB DEFAULT '{}'::jsonb,

    -- Profile photos for thumbnail generation
    profile_photos TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analyses table (stores analysis results for each project)
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    gcs_path TEXT,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions table (stores user's post-analysis choices)
CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chosen_category TEXT NOT NULL CHECK (chosen_category IN ('safe', 'bold', 'avoid')),
    frame_id TEXT,
    timestamp NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE channel_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channel_profiles
CREATE POLICY "Users can view their own channel profile"
    ON channel_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own channel profile"
    ON channel_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channel profile"
    ON channel_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for analyses
CREATE POLICY "Users can view analyses for their projects"
    ON analyses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = analyses.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert analyses for their projects"
    ON analyses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = analyses.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- RLS Policies for decisions
CREATE POLICY "Users can view decisions for their projects"
    ON decisions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = decisions.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert decisions for their projects"
    ON decisions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = decisions.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_channel_profiles_updated_at BEFORE UPDATE ON channel_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add usage tracking columns to existing channel_profiles table (if already created)
-- Run these ONLY if you already have the table without these columns:
-- ALTER TABLE channel_profiles ADD COLUMN IF NOT EXISTS analyses_used INTEGER DEFAULT 0 CHECK (analyses_used >= 0);
-- ALTER TABLE channel_profiles ADD COLUMN IF NOT EXISTS is_tester BOOLEAN DEFAULT FALSE;

-- Function to check if user can perform analysis
CREATE OR REPLACE FUNCTION can_user_analyze(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    profile_record RECORD;
    analysis_limit INTEGER := 50;
BEGIN
    -- Get user profile
    SELECT analyses_used, is_tester INTO profile_record
    FROM channel_profiles
    WHERE user_id = user_uuid;
    
    -- If no profile exists, create one and allow analysis
    IF NOT FOUND THEN
        INSERT INTO channel_profiles (user_id) VALUES (user_uuid);
        RETURN TRUE;
    END IF;
    
    -- Testers have unlimited analyses
    IF profile_record.is_tester THEN
        RETURN TRUE;
    END IF;
    
    -- Check if under limit
    RETURN profile_record.analyses_used < analysis_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment analysis count
CREATE OR REPLACE FUNCTION increment_analysis_count(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Ensure profile exists
    INSERT INTO channel_profiles (user_id, analyses_used)
    VALUES (user_uuid, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        analyses_used = channel_profiles.analyses_used + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's remaining analyses
CREATE OR REPLACE FUNCTION get_remaining_analyses(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    used_count INTEGER;
    is_tester_flag BOOLEAN;
    analysis_limit INTEGER := 50;
BEGIN
    SELECT analyses_used, is_tester INTO used_count, is_tester_flag
    FROM channel_profiles
    WHERE user_id = user_uuid;
    
    -- If no profile, user has full limit
    IF NOT FOUND THEN
        RETURN analysis_limit;
    END IF;
    
    -- Testers have unlimited (return -1 to indicate unlimited)
    IF is_tester_flag THEN
        RETURN -1;
    END IF;
    
    -- Return remaining
    RETURN GREATEST(0, analysis_limit - used_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

