import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';

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

        // Profiling
        profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
        integrations: [
            nodeProfilingIntegration(),
        ],

        // Don't send errors in development
        enabled: NODE_ENV === 'production',

        // Filter out sensitive data
        beforeSend(event) {
            // Remove sensitive headers
            if (event.request?.headers) {
                delete event.request.headers['authorization'];
                delete event.request.headers['cookie'];
            }
            return event;
        },
    });

    console.log('✅ Sentry initialized for backend');
}

// Export Sentry for use in error handlers
export { Sentry };
