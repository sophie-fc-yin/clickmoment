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
        const { data: existing } = await supabase
            .from('channel_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();
        
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
            return { data };
        } else {
            // Insert new profile
            const { data, error } = await supabase
                .from('channel_profiles')
                .insert(profileToSave)
                .select()
                .single();
            
            if (error) {
                console.error('Error creating profile:', error);
                return { error };
            }
            return { data };
        }
    }
}

