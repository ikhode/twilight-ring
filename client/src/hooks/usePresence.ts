import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

export interface PresenceState {
    user_id: string;
    email: string;
    name?: string;
    page: string;
    online_at: string;
}

/**
 * Hook to track and display users present on a specific page
 * Uses Supabase Presence for real-time user tracking
 */
export function usePresence(page: string, customIdentity?: { id: string; email: string; name: string }) {
    const { user, profile } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
    const [isTracking, setIsTracking] = useState(false);

    useEffect(() => {
        // If we are in a kiosk and have a custom employee identity, we track even without a Supabase session
        if (!user && !customIdentity) return;

        const trackId = customIdentity?.id || user?.id;
        if (!trackId) return;

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: trackId,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState<PresenceState>();
                const users = Object.values(state)
                    .flat()
                    .filter(u => u.page === page);
                setOnlineUsers(users);
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                console.log('👋 User joined:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log('👋 User left:', leftPresences);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    setIsTracking(true);
                    await channel.track({
                        user_id: trackId,
                        email: customIdentity?.email || user?.email || '',
                        name: customIdentity?.name || profile?.name || user?.email?.split('@')[0] || 'Unknown',
                        page,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            channel.untrack();
            supabase.removeChannel(channel);
            setIsTracking(false);
        };
    }, [user, profile, page, customIdentity?.id, customIdentity?.email, customIdentity?.name]);

    return { onlineUsers, isTracking };
}
