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
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || NODE_ENV,
        release: import.meta.env.VITE_SENTRY_RELEASE || 'twilight-ring@unknown',

        // Performance monitoring
        tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || (NODE_ENV === 'production' ? '0.1' : '1.0')),

        // Session replay
        replaysSessionSampleRate: 0.1, // 10% of sessions
        replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],

        // Enable in production or when explicitly enabled
        enabled: NODE_ENV === 'production' || import.meta.env.VITE_SENTRY_ENABLED === 'true',

        // Filter out sensitive data and unwanted errors
        beforeSend(event) {
            // Remove sensitive data from breadcrumbs
            if (event.breadcrumbs) {
                event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
                    if (breadcrumb.data) {
                        delete breadcrumb.data.password;
                        delete breadcrumb.data.token;
                        delete breadcrumb.data.apiKey;
                    }
                    return breadcrumb;
                });
            }

            // Don't send errors from browser extensions
            if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
                frame => frame.filename?.includes('extension://')
            )) {
                return null;
            }

            return event;
        },

        // Ignore certain errors
        ignoreErrors: [
            // Browser extensions
            'top.GLOBALS',
            'chrome-extension://',
            'moz-extension://',
            // Random plugins/extensions
            'Can\'t find variable: ZiteReader',
            'jigsaw is not defined',
            'ComboSearch is not defined',
            // Network errors (handled separately)
            'NetworkError',
            'Failed to fetch',
            // ResizeObserver errors (benign)
            'ResizeObserver loop limit exceeded',
        ],
    });

    console.log(`✅ Sentry initialized for frontend (${import.meta.env.VITE_SENTRY_ENVIRONMENT || NODE_ENV})`);
}

/**
 * Set user context for Sentry error reports
 */
export function setUserContext(user: { id: string; email?: string; username?: string; organizationId?: string } | null) {
    if (user) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.username,
        });

        // Add organization as a tag for filtering
        if (user.organizationId) {
            Sentry.setTag('organization_id', user.organizationId);
        }
    } else {
        Sentry.setUser(null);
    }
}

/**
 * Add breadcrumb for user actions
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
    });
}

// Export components for error boundaries
export const ErrorBoundary = Sentry.ErrorBoundary;
export { Sentry };

