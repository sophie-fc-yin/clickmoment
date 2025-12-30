// Profile management using Supabase
import { supabase } from './supabase.js';

export class ProfileManager {
    // Get or create channel profile for current user
    async getProfile(userId) {
        const { data, error } = await supabase
            .from('channel_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching profile:', error);
            return null;
        }
        
        return data || null;
    }

    // Create or update channel profile
    async saveProfile(userId, profileData) {
        console.log('saveProfile called with userId:', userId);
        console.log('Profile data to save:', profileData);
        
        const { data: existing, error: checkError } = await supabase
            .from('channel_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing profile:', checkError);
        }
        
        console.log('Existing profile:', existing ? 'Found' : 'Not found');
        
        const profileToSave = {
            user_id: userId,
            stage: profileData.stage || null,
            subscriber_count: profileData.subscriber_count || null,
            content_niche: profileData.content_niche || null,
            upload_frequency: profileData.upload_frequency || null,
            growth_goal: profileData.growth_goal || null,
        };
        
        if (existing) {
            // Update existing profile
            console.log('Updating existing profile with:', profileToSave);
            const { data, error } = await supabase
                .from('channel_profiles')
                .update(profileToSave)
                .eq('user_id', userId)
                .select()
                .single();
            
            if (error) {
                console.error('Error updating profile:', error);
                return { error };
            }
            console.log('Profile updated successfully:', data);
            return { data };
        } else {
            // Insert new profile
            console.log('Creating new profile with:', profileToSave);
            const { data, error } = await supabase
                .from('channel_profiles')
                .insert(profileToSave)
                .select()
                .single();
            
            if (error) {
                console.error('Error creating profile:', error);
                return { error };
            }
            console.log('Profile created successfully:', data);
            return { data };
        }
    }

    // Check if user can perform analysis (under limit or is tester)
    async canUserAnalyze(userId) {
        try {
            const { data, error } = await supabase.rpc('can_user_analyze', {
                user_uuid: userId
            });
            
            if (error) {
                console.error('Error checking analysis limit:', error);
                return { canAnalyze: false, error };
            }
            
            return { canAnalyze: data, error: null };
        } catch (error) {
            console.error('Exception checking analysis limit:', error);
            return { canAnalyze: false, error };
        }
    }

    // Increment analysis count for user
    async incrementAnalysisCount(userId) {
        try {
            const { error } = await supabase.rpc('increment_analysis_count', {
                user_uuid: userId
            });
            
            if (error) {
                console.error('Error incrementing analysis count:', error);
                return { error };
            }
            
            console.log('Analysis count incremented for user:', userId);
            return { error: null };
        } catch (error) {
            console.error('Exception incrementing analysis count:', error);
            return { error };
        }
    }

    // Get remaining analyses for user
    async getRemainingAnalyses(userId) {
        try {
            const { data, error } = await supabase.rpc('get_remaining_analyses', {
                user_uuid: userId
            });
            
            if (error) {
                console.error('Error getting remaining analyses:', error);
                return { remaining: null, error };
            }
            
            // -1 indicates unlimited (tester)
            return { remaining: data, isUnlimited: data === -1, error: null };
        } catch (error) {
            console.error('Exception getting remaining analyses:', error);
            return { remaining: null, error };
        }
    }
}

