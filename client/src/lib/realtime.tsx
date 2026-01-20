import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeContextType = {
    isConnected: boolean;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    channels: Map<string, RealtimeChannel>;
};

const RealtimeContext = createContext<RealtimeContextType>({
    isConnected: false,
    connectionStatus: 'disconnected',
    channels: new Map(),
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
    const [channels] = useState<Map<string, RealtimeChannel>>(new Map());
    const { toast } = useToast();

    useEffect(() => {
        setConnectionStatus('connecting');
        const channel = supabase.channel("system-status");

        channel
            .on("broadcast", { event: "status" }, (payload) => {
                console.log("📡 Received system status update:", payload);
                // Only show toast for important system updates
                if (payload.severity === 'high' || payload.severity === 'critical') {
                    toast({
                        title: "System Update",
                        description: payload.message || "New system status received",
                        variant: payload.severity === 'critical' ? 'destructive' : 'default',
                    });
                }
            })
            .subscribe((status) => {
                const connected = status === "SUBSCRIBED";
                setIsConnected(connected);

                if (status === "SUBSCRIBED") {
                    setConnectionStatus('connected');
                    console.log("✅ Realtime connection established");
                } else if (status === "CHANNEL_ERROR") {
                    setConnectionStatus('error');
                    console.error("❌ Realtime connection error");
                } else if (status === "TIMED_OUT") {
                    setConnectionStatus('error');
                    console.error("⏱️ Realtime connection timed out");
                } else if (status === "CLOSED") {
                    setConnectionStatus('disconnected');
                    console.log("🔌 Realtime connection closed");
                }
            });

        channels.set('system-status', channel);

        return () => {
            supabase.removeChannel(channel);
            channels.delete('system-status');
            setConnectionStatus('disconnected');
        };
    }, [toast, channels]);

    return (
        <RealtimeContext.Provider value={{ isConnected, connectionStatus, channels }}>
            {children}
        </RealtimeContext.Provider>
    );
}

export const useRealtime = () => useContext(RealtimeContext);
