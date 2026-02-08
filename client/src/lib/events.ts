import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
// Ensure shared types are imported correctly
// Assuming 'shared/schema' is available via path alias or relative path
import { type SystemEvent, type Notification } from '@shared/schema';

type EventType = SystemEvent['type'];
type EventSeverity = SystemEvent['severity'];

interface SystemEventBusState {
    events: SystemEvent[];
    notifications: Notification[];
    unreadCount: number;
    isConnected: boolean;

    // Actions
    addEvent: (event: SystemEvent) => void;
    addNotification: (notification: Notification) => void;
    setNotifications: (notifications: Notification[]) => void;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;

    // Publisher (sends to server)
    emit: (type: string, message: string, severity?: string, metadata?: any) => Promise<void>;
}

export const useSystemEventBus = create<SystemEventBusState>((set, get) => ({
    events: [],
    notifications: [],
    unreadCount: 0,
    isConnected: false,

    addEvent: (event) => set((state) => ({
        events: [event, ...state.events].slice(0, 100) // Keep last 100
    })),

    addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + (notification.readAt ? 0 : 1)
    })),

    setNotifications: (notifications) => set({
        notifications,
        unreadCount: notifications.filter(n => !n.readAt).length
    }),

    markAsRead: async (notificationId) => {
        // Optimistic update
        set((state) => ({
            notifications: state.notifications.map(n =>
                n.id === notificationId ? { ...n, readAt: new Date() } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1)
        }));

        // Server update
        try {
            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            console.error("Failed to mark as read", e);
        }
    },

    markAllAsRead: async () => {
        set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, readAt: new Date() })),
            unreadCount: 0
        }));

        try {
            await fetch(`/api/notifications/read-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            console.error("Failed to mark all as read", e);
        }
    },

    emit: async (type, message, severity = 'info', metadata = {}) => {
        try {
            await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type, message, severity, metadata })
            });
        } catch (err) {
            console.error("Failed to emit system event:", err);
        }
    }
}));

// Subscription Manager
export function initializeEventSubscription() {
    const { addEvent, addNotification } = useSystemEventBus.getState();

    // System Events Channel (Global or Org-based)
    // In a real app, filtering by organization_id in RLS is enough,
    // but for client-side filtering we might need channel parameters if we want to reduce bandwidth.
    // However, Supabase Realtime broadcasts to all subscribers of the table unless RLS filters it?
    // Actually, Supabase Realtime respects RLS if enabled and Row Level Security is on.
    // We assume the client is authenticated and Supabase handles the filtering.
    const eventChannel = supabase.channel('system_events')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_events' }, payload => {
            const event = payload.new as SystemEvent;
            addEvent(event);
        })
        .subscribe();

    // Notifications Channel (User-based)
    const notificationChannel = supabase.channel('notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
            const notification = payload.new as Notification;
            addNotification(notification);

            // Trigger browser notification if supported
            if (Notification.permission === 'granted') {
                new Notification(notification.title, { body: notification.message });
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(eventChannel);
        supabase.removeChannel(notificationChannel);
    };
}
