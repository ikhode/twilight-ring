import { createClient } from '@supabase/supabase-js';

// For local development, these might be hardcoded or from env
// In Vite, use import.meta.env.VITE_SUPABASE_URL
// Ensure these variables are in your client's .env

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
