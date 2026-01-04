// Project management using Supabase
import { supabase } from './supabase.js';

export class ProjectManager {
    constructor(userId) {
        this.userId = userId;
    }

    // Get all projects for the current user, ordered by latest updated
    async getProjects() {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', this.userId)
            .order('updated_at', { ascending: false });
        
        if (error) {
            console.error('Error loading projects:', error);
            return [];
        }
        
        return data || [];
    }

    // Create a new project
    async createProject(projectData) {
        const { data, error } = await supabase
            .from('projects')
            .insert({
                user_id: this.userId,
                name: projectData.name || `Project ${new Date().toISOString()}`,
                content_sources: projectData.content_sources || {},
                creative_direction: projectData.creative_direction || {},
                creator_context: projectData.creator_context || {},
                profile_photos: projectData.profile_photos || [],
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            return { error };
        }

        return { data };
    }

    // Get a project by ID
    async getProject(projectId) {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .eq('user_id', this.userId)
            .single();
        
        if (error) {
            console.error('Error fetching project:', error);
            return null;
        }
        
        return data;
    }

    // Update a project
    async updateProject(projectId, updates) {
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .eq('user_id', this.userId)
            .select()
            .single();
        
        if (error) {
            console.error('Error updating project:', error);
            return { error };
        }
        
        return { data };
    }

    // Delete a project
    async deleteProject(projectId) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)
            .eq('user_id', this.userId);
        
        if (error) {
            console.error('Error deleting project:', error);
            return { error };
        }
        
        return { success: true };
    }

    // Add analysis result to a project
    async addAnalysis(projectId, analysisData, gcsPath = null) {
        const { data, error } = await supabase
            .from('analyses')
            .insert({
                project_id: projectId,
                gcs_path: gcsPath,
                result: analysisData
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error saving analysis:', error);
            return { error };
        }
        
        return { data };
    }

    // Get analyses for a project
    async getAnalyses(projectId) {
        const { data, error } = await supabase
            .from('analyses')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching analyses:', error);
            return [];
        }
        
        return data || [];
    }
}
