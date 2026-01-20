
import { createClient } from '@supabase/supabase-js';

// In a real scenario, this would be properly configured
// For now, we assume the standard Supabase endpoint structure
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function graphqlQuery(query: string, variables?: any) {
    const { data, error } = await supabase.functions.invoke('graphql', {
        body: { query, variables }
    });

    if (error) {
        console.error('GraphQL Error:', error);
        throw error;
    }

    return data;
}

// Alternatively, direct fetch to the /graphql endpoint if enabled
export async function rawGraphqlQuery(query: string, variables?: any) {
    const response = await fetch(`${SUPABASE_URL}/graphql/v1`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ query, variables })
    });

    const result = await response.json();
    if (result.errors) {
        throw new Error(result.errors[0].message);
    }
    return result.data;
}
