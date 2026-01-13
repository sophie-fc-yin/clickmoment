// Project management using Supabase
import { supabase } from './supabase.js';

export class ProjectManager {
    constructor(userId) {
        this.userId = userId;
    }

    // Get all projects for the current user, ordered by latest updated
    async getProjects() {
        console.log('🔍 ProjectManager.getProjects() called');
        console.log('   Current userId:', this.userId);

        // First, let's verify the Supabase client is working
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error('❌ Session error:', sessionError);
        } else {
            console.log('   Session user:', session?.user?.id || 'NO SESSION');
            console.log('   User ID match:', session?.user?.id === this.userId);
        }

        // Try to query projects
        console.log('🔎 Executing Supabase query...');
        const { data, error, count } = await supabase
            .from('projects')
            .select('*', { count: 'exact' })
            .eq('user_id', this.userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('❌ Error loading projects:', error);
            console.error('📋 Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                statusCode: error.statusCode
            });

            // Check for specific error codes
            if (error.code === '42501') {
                console.error('🔒 RLS POLICY ERROR: Row Level Security is blocking access');
                console.error('   This means RLS policies are not configured correctly');
            } else if (error.code === '42P01') {
                console.error('📊 TABLE NOT FOUND: The projects table does not exist');
            } else if (error.code === 'PGRST116') {
                console.error('🔑 JWT ERROR: Authentication token is invalid or expired');
            }

            return [];
        }

        console.log('✅ Projects query successful!');
        console.log('   Total projects found:', data?.length || 0);
        console.log('   Total count:', count);

        if (data && data.length > 0) {
            console.log('📦 Sample project:', data[0]);
        } else {
            console.warn('⚠️  No projects returned - possible causes:');
            console.warn('   1. No projects exist for this user');
            console.warn('   2. RLS policy is filtering them out');
            console.warn('   3. user_id does not match');
        }

        return data || [];
    }

    // Create a new project
    async createProject(projectData) {
        console.log('📝 Creating new project:', {
            name: projectData.name,
            userId: this.userId,
            hasCreativeDirection: !!projectData.creative_direction,
            hasCreatorContext: !!projectData.creator_context
        });

        const insertData = {
            user_id: this.userId,
            name: projectData.name || `Project ${new Date().toISOString()}`,
            content_sources: projectData.content_sources || {},
            creative_direction: projectData.creative_direction || {},
            creator_context: projectData.creator_context || {},
            profile_photos: projectData.profile_photos || [],
        };

        console.log('📦 Insert data:', insertData);

        const { data, error } = await supabase
            .from('projects')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating project:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            return { error };
        }

        console.log('✅ Project created successfully:', data);
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
        console.log('✏️ Updating project:', {
            projectId,
            userId: this.userId,
            updateKeys: Object.keys(updates)
        });
        console.log('📦 Update data:', updates);

        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .eq('user_id', this.userId)
            .select()
            .single();

        if (error) {
            console.error('❌ Error updating project:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            return { error };
        }

        console.log('✅ Project updated successfully:', data);
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
        console.log('Attempting to save analysis for projectId:', projectId);
        
        // Log data size for debugging and validate JSON serialization
        let dataSize;
        try {
            dataSize = JSON.stringify(analysisData).length;
            console.log(`Analysis data size: ${(dataSize / 1024).toFixed(2)} KB`);
        } catch (serializeError) {
            console.error('Failed to serialize analysis data:', serializeError);
            return { error: new Error('Analysis data contains non-serializable content') };
        }
        
        const startTime = Date.now();

        try {
            console.log('Sending insert request to Supabase...');
            
            // Add timeout wrapper for Supabase insert (30 seconds)
            const insertPromise = supabase
                .from('analyses')
                .insert({
                    project_id: projectId,
                    gcs_path: gcsPath,
                    result: analysisData
                })
                .select()
                .single();
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Supabase insert timed out after 30 seconds'));
                }, 30000);
            });
            
            const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

            const duration = Date.now() - startTime;
            console.log(`Supabase insert completed in ${duration}ms`);

            if (error) {
                console.error('Failed to save analysis:', error.message);
                console.error('Full error:', error);
                console.error('Error code:', error.code);
                console.error('Error details:', error.details);
                return { error };
            }

            console.log('Analysis saved successfully to database!');
            return { data };
        } catch (err) {
            const duration = Date.now() - startTime;
            console.error(`Exception saving analysis after ${duration}ms:`, err);
            console.error('Exception type:', err.constructor.name);
            console.error('Exception message:', err.message);
            
            // If it's a timeout, try to check if Supabase connection is working
            if (err.message.includes('timed out')) {
                console.error('Supabase insert timed out - this may indicate a network or database issue');
            }
            
            return { error: err };
        }
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
