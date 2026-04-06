import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: any;

try {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL and Anon Key are missing from environment variables.');
    }
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error: any) {
    console.error('CRITICAL: Supabase initialization failed:', error.message);
    // Provide a mock client to prevent downstream crashes, but keep the error logged
    supabase = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
            signInWithPassword: async () => ({ error: new Error('Supabase not configured') }),
            signOut: async () => ({ error: null }),
        }
    };
}

export { supabase };
