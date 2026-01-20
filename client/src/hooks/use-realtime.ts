import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

type RealtimeOptions = { // Generic options
    table?: string;
    schema?: string;
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    filter?: string;
    channelName?: string;
    onReceive?: (payload: any) => void;
    queryKeyToInvalidate?: string[];
};

export function useRealtimeSubscription({
    table = "*",
    schema = "public",
    event = "*",
    filter,
    channelName,
    onReceive,
    queryKeyToInvalidate
}: RealtimeOptions) {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channelId = channelName || `sub-${schema}-${table}-${event}`;

        console.log(`🔌 Subscribing to Realtime: ${channelId}`);

        const channel = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                {
                    event: event,
                    schema: schema,
                    table: table,
                    filter: filter
                } as any,
                (payload) => {
                    console.log('⚡ Realtime Event:', payload);

                    if (onReceive) {
                        onReceive(payload);
                    }

                    if (queryKeyToInvalidate) {
                        console.log('🔄 Invalidating Query:', queryKeyToInvalidate);
                        queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Connected to ${channelId}`);
                }
            });

        return () => {
            console.log(`🔌 Unsubscribing from ${channelId}`);
            supabase.removeChannel(channel);
        };
    }, [table, schema, event, filter, channelName, queryClient, queryKeyToInvalidate]);
}
