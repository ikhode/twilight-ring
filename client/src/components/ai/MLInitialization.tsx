import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { mlCore } from '@/services/ai/ml_core';

/**
 * MLInitialization - Background component to trigger MLCore initialization.
 * Listens for organization changes and triggers model loading/updates.
 */
export function MLInitialization() {
    const { organization, loading } = useAuth();

    useEffect(() => {
        if (!loading && organization?.id) {
            console.log(`[ML Init] Initializing for ${organization.name}`);
            mlCore.initialize(organization.id).catch(err => {
                console.error('[ML Init] Failed to initialize ML Core:', err);
            });
        }
    }, [organization?.id, loading]);

    return null; // Silent component
}
