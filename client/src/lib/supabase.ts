import { createClient } from '@supabase/supabase-js';

// For local development, these might be hardcoded or from env
// In Vite, use import.meta.env.VITE_SUPABASE_URL
// Ensure these variables are in your client's .env

// The original supabaseUrl and supabaseAnonKey variables are removed
// as the createClient call will now directly use import.meta.env variables.

// The warning check for missing variables is also removed,
// as the new createClient call uses '!' which implies they are expected to exist.

import { Database } from '../types/database.types';

export const supabase = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

/**
 * Sync Supabase session to backend cookies for SSR authentication
 * Call this after successful login (SIGNED_IN event)
 */
export async function syncSessionToCookies() {
    try {
        const { data } = await supabase.auth.getSession();

        if (data.session) {
            await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token
                }),
                credentials: 'include' // Important: include cookies
            });
        }
    } catch (error) {
        console.error('[Auth] Failed to sync session to cookies:', error);
    }
}
