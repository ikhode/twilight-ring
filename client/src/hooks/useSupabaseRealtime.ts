import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseSupabaseRealtimeOptions<T extends { [key: string]: any } = any> {
    table: string;
    queryKey?: any[];
    filter?: string;
    onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
    onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
    onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
    enabled?: boolean;
}

/**
 * Hook reutilizable para subscripciones Supabase Realtime
 * 
 * Características:
 * - Subscripción automática a cambios en tabla
 * - Invalidación automática de React Query cache
 * - Filtrado por organization_id para multi-tenancy
 * - Cleanup automático al desmontar
 * 
 * @example
 * ```tsx
 * useSupabaseRealtime({
 *   table: 'employees',
 *   queryKey: ['/api/employees'],
 *   onInsert: (payload) => console.log('New employee:', payload.new),
 * });
 * ```
 */
export function useSupabaseRealtime<T extends { [key: string]: any } = any>({
    table,
    queryKey,
    filter,
    onInsert,
    onUpdate,
    onDelete,
    enabled = true,
}: UseSupabaseRealtimeOptions<T>) {
    const queryClient = useQueryClient();
    const { user, organization } = useAuth();

    useEffect(() => {
        if (!enabled || !user || !organization) return;

        let channel: RealtimeChannel;

        const setupChannel = async () => {
            // Create unique channel name
            const channelName = `realtime:${table}:${user.id}`;

            channel = supabase.channel(channelName);

            // Build filter string for organization_id if not provided
            const filterString = filter || `organization_id=eq.${organization.id}`;

            // Subscribe to INSERT events
            if (onInsert) {
                channel.on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table,
                        filter: filterString,
                    },
                    (payload) => {
                        onInsert(payload as RealtimePostgresChangesPayload<T>);
                        // Invalidate queries if queryKey provided
                        if (queryKey) {
                            queryClient.invalidateQueries({ queryKey });
                        }
                    }
                );
            }

            // Subscribe to UPDATE events
            if (onUpdate) {
                channel.on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table,
                        filter: filterString,
                    },
                    (payload) => {
                        onUpdate(payload as RealtimePostgresChangesPayload<T>);
                        if (queryKey) {
                            queryClient.invalidateQueries({ queryKey });
                        }
                    }
                );
            }

            // Subscribe to DELETE events
            if (onDelete) {
                channel.on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table,
                        filter: filterString,
                    },
                    (payload) => {
                        onDelete(payload as RealtimePostgresChangesPayload<T>);
                        if (queryKey) {
                            queryClient.invalidateQueries({ queryKey });
                        }
                    }
                );
            }

            // If no specific handlers, subscribe to all changes and just invalidate
            if (!onInsert && !onUpdate && !onDelete && queryKey) {
                channel.on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table,
                        filter: filterString,
                    },
                    () => {
                        queryClient.invalidateQueries({ queryKey });
                    }
                );
            }

            // Subscribe to channel
            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Realtime subscribed to ${table}`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error(`❌ Realtime error on ${table}`);
                }
            });
        };

        setupChannel();

        // Cleanup
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
                console.log(`🔌 Realtime unsubscribed from ${table}`);
            }
        };
    }, [table, queryKey, filter, enabled, user, onInsert, onUpdate, onDelete, queryClient]);
}

/**
 * Hook simplificado para invalidar queries automáticamente
 * sin necesidad de handlers personalizados
 */
export function useRealtimeInvalidation(table: string, queryKey: any[]) {
    return useSupabaseRealtime({
        table,
        queryKey,
    });
}
