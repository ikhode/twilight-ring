import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const NODE_ENV = import.meta.env.MODE || 'development';

export function initSentry() {
    if (!SENTRY_DSN) {
        console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        environment: NODE_ENV,

        // Performance monitoring
        tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,

        // Session replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],

        // Don't send errors in development
        enabled: NODE_ENV === 'production',

        // Filter out sensitive data
        beforeSend(event) {
            // Remove sensitive data from breadcrumbs
            if (event.breadcrumbs) {
                event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
                    if (breadcrumb.data) {
                        delete breadcrumb.data.password;
                        delete breadcrumb.data.token;
                    }
                    return breadcrumb;
                });
            }
            return event;
        },
    });

    console.log('✅ Sentry initialized for frontend');
}

// Export components for error boundaries
export const ErrorBoundary = Sentry.ErrorBoundary;
export { Sentry };
