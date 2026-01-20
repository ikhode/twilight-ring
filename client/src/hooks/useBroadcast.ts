import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface BroadcastMessage {
    type: 'notification' | 'alert' | 'update' | 'action';
    title: string;
    message: string;
    severity?: 'info' | 'warning' | 'error' | 'success';
    data?: any;
    from_user_id?: string;
}

/**
 * Hook to send and receive real-time broadcast messages
 * Uses Supabase Broadcast for instant notifications across all clients
 */
export function useBroadcast(channelName: string = 'app-notifications') {
    const { toast } = useToast();

    useEffect(() => {
        const channel = supabase.channel(channelName);

        channel
            .on('broadcast', { event: 'notification' }, (payload) => {
                const msg = payload.payload as BroadcastMessage;

                // Show toast notification
                toast({
                    title: msg.title,
                    description: msg.message,
                    variant: msg.severity === 'error' ? 'destructive' : 'default',
                });
            })
            .on('broadcast', { event: 'alert' }, (payload) => {
                const msg = payload.payload as BroadcastMessage;

                // Show alert (more prominent than notification)
                toast({
                    title: `⚠️ ${msg.title}`,
                    description: msg.message,
                    variant: 'destructive',
                    duration: 10000, // Longer duration for alerts
                });
            })
            .on('broadcast', { event: 'update' }, (payload) => {
                const msg = payload.payload as BroadcastMessage;
                console.log('📡 Broadcast update received:', msg);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [channelName, toast]);

    const broadcast = useCallback(async (message: BroadcastMessage) => {
        const channel = supabase.channel(channelName);

        await channel.send({
            type: 'broadcast',
            event: message.type,
            payload: message,
        });

        // Clean up the temporary channel
        await supabase.removeChannel(channel);
    }, [channelName]);

    return { broadcast };
}
