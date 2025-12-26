import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Get environment variables
const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';

let supabase;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
    // Create a dummy client to prevent errors
    supabase = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            signInWithOAuth: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
            signOut: async () => ({ error: null }),
            onAuthStateChange: () => ({ data: { subscription: null } })
        }
    };
} else {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (error) {
        console.error('Failed to create Supabase client:', error);
        supabase = {
            auth: {
                getSession: async () => ({ data: { session: null }, error }),
                signInWithOAuth: async () => ({ data: null, error }),
                signOut: async () => ({ error }),
                onAuthStateChange: () => ({ data: { subscription: null } })
            }
        };
    }
}

export { supabase };

export async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        return {
            'Authorization': `Bearer ${session.access_token}`
        };
    }
    return {};
}

