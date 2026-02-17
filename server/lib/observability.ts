import { Request, Response, NextFunction } from "express";
import { Sentry } from "./sentry";

/**
 * interface for the tracker object
 */
export interface Tracker {
    error: (error: any, context?: any) => void;
    info: (message: string, context?: any) => void;
    dbQuery: (duration: number, query: string, success: boolean, level?: 'info' | 'warn' | 'error', error?: any) => void;
}

/**
 * Unified error tracking service.
 * Integrates with Sentry for production error tracking.
 */
export const tracker: Tracker = {
    error: (error: any, context?: any) => {
        const timestamp = new Date().toISOString();
        console.error(`[TRACKER][${timestamp}] ERROR:`, {
            message: error.message,
            stack: error.stack,
            context,
        });

        // Send to Sentry if available
        if (Sentry) {
            Sentry.captureException(error, {
                contexts: {
                    custom: context,
                },
                tags: {
                    source: 'backend',
                },
            });
        }
    },
    info: (message: string, context?: any) => {
        const timestamp = new Date().toISOString();
        console.info(`[TRACKER][${timestamp}] INFO: ${message}`, context);

        // Add breadcrumb to Sentry
        if (Sentry) {
            Sentry.addBreadcrumb({
                message,
                data: context,
                level: 'info',
            });
        }
    },
    /**
     * Track database query performance
     */
    dbQuery: (duration: number, query: string, success: boolean, level: 'info' | 'warn' | 'error' = 'info', error?: any) => {
        // Truncate long queries for logging
        const sanitizedQuery = query.length > 200 ? query.substring(0, 200) + '...' : query;

        const logData = {
            duration: `${duration.toFixed(2)}ms`,
            query: sanitizedQuery,
            success,
            error: error?.message
        };

        if (level === 'error' || level === 'warn') {
            const timestamp = new Date().toISOString();
            console[level === 'error' ? 'error' : 'warn'](`[DB][${timestamp}] ${level.toUpperCase()} (${duration.toFixed(0)}ms): ${sanitizedQuery}`, logData);

            if (Sentry && level === 'error') {
                Sentry.captureException(error || new Error(`Slow DB Query: ${sanitizedQuery}`), {
                    tags: { source: 'db', duration: duration > 1000 ? 'slow_critical' : 'slow_warn' },
                    extra: { duration, query, fullQuery: query }
                });
            }
        }
    }
};

/**
 * Health check endpoint handler.
 */
export function healthCheck(req: Request, res: Response) {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        env: process.env.NODE_ENV,
    });
}

/**
 * Global error handling middleware.
 * Integrates with Sentry for automatic error capture.
 */
export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
    tracker.error(err, {
        path: req.path,
        method: req.method,
        ip: req.ip,
    });

    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message;

    res.status(status).json({
        error: true,
        message,
    });
}
