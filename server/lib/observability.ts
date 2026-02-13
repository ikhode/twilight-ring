import { Request, Response, NextFunction } from "express";

/**
 * Unified error tracking service.
 * In production, this would integrate with Sentry, LogRocket, or Datadog.
 */
export const tracker = {
    error: (error: any, context?: any) => {
        const timestamp = new Date().toISOString();
        console.error(`[TRACKER][${timestamp}] ERROR:`, {
            message: error.message,
            stack: error.stack,
            context,
        });
        // Integration point for Sentry.captureException(error)
    },
    info: (message: string, context?: any) => {
        const timestamp = new Date().toISOString();
        console.info(`[TRACKER][${timestamp}] INFO: ${message}`, context);
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
