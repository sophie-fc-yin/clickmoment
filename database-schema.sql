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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    
    -- Target settings
    platform TEXT DEFAULT 'youtube',
    optimization TEXT,
    audience_profile TEXT CHECK (char_length(audience_profile) <= 200),
    
    -- Creative Brief settings
    mood TEXT CHECK (char_length(mood) <= 120),
    title_hint TEXT,
    brand_colors TEXT[], -- Array of color strings
    notes TEXT CHECK (char_length(notes) <= 1000),
    
    -- Video path (stored after video upload)
    video_path TEXT,
    
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

-- Enable Row Level Security (RLS)
ALTER TABLE channel_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

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

