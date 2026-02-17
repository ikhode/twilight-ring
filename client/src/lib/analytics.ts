
import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { addBreadcrumb } from '@/lib/sentry';

type AnalyticsEventType = 'page_view' | 'feature_used' | 'error' | 'click';

interface TrackEventProps {
    eventName: string;
    eventType?: AnalyticsEventType;
    properties?: Record<string, any>;
}

export function useAnalytics() {
    const [location] = useLocation();
    const { user, organization } = useAuth();

    const track = useCallback(async ({ eventName, eventType = 'feature_used', properties = {} }: TrackEventProps) => {
        // 1. Add to Sentry Breadcrumbs
        addBreadcrumb(eventName, 'analytics', { ...properties, eventType });

        // 2. Send to Internal API
        try {
            if (organization) {
                await fetch('/api/analytics/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        organizationId: organization.id,
                        userId: user?.id,
                        eventType,
                        eventName,
                        properties,
                        path: location,
                    }),
                });
            }
        } catch (error) {
            console.warn('Failed to log analytics event', error);
            // Don't throw to avoid breaking UX
        }
    }, [location, user, organization]);

    return { track };
}
