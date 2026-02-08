import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { Request, Response } from 'express';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
}

if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY must be set for SSR authentication.");
}

// Create a Supabase client with the Service Role key for backend admin tasks
export const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Create a Supabase SSR client for validating user sessions from cookies
 * This client uses the anon key (safe for server-side) and reads/writes cookies
 */
export function createSupabaseServerClient(req: Request, res: Response) {
    return createServerClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name) => req.cookies[name],
                set: (name, value, options) => {
                    if (res.headersSent) return;
                    res.cookie(name, value, {
                        ...options,
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/',
                    });
                },
                remove: (name) => {
                    if (res.headersSent) return;
                    res.clearCookie(name, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/',
                    });
                },
            },
        }
    );
}
