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
        environment: process.env.SENTRY_ENVIRONMENT || NODE_ENV,
        release: process.env.SENTRY_RELEASE || 'twilight-ring@unknown',

        // Performance monitoring
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || (NODE_ENV === 'production' ? '0.1' : '1.0')),
        profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || (NODE_ENV === 'production' ? '0.1' : '1.0')),

        integrations: [
            nodeProfilingIntegration(),
        ],

        // Enable in production or when explicitly enabled
        enabled: NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

        // Filter and enhance errors before sending
        beforeSend(event, hint) {
            // Remove sensitive headers
            if (event.request?.headers) {
                delete event.request.headers['authorization'];
                delete event.request.headers['cookie'];
                delete event.request.headers['x-api-key'];
            }

            // Don't send 404 errors
            if (event.exception?.values?.[0]?.value?.includes('404')) {
                return null;
            }

            // Add custom tags for better filtering
            if (event.request) {
                event.tags = {
                    ...event.tags,
                    method: event.request.method,
                    url: event.request.url,
                };
            }

            return event;
        },
    });

    console.log(`✅ Sentry initialized for backend (${process.env.SENTRY_ENVIRONMENT || NODE_ENV})`);
}

// Export Sentry for use in error handlers
export { Sentry };

