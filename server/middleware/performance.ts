import { Request, Response, NextFunction } from 'express';

export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to ms
        const endMemory = process.memoryUsage();
        const memoryDelta = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024; // MB

        (req as any).logger?.info('performance_metric', {
            path: req.path,
            method: req.method,
            duration_ms: Math.round(duration * 100) / 100,
            memory_delta_mb: Math.round(memoryDelta * 100) / 100,
            statusCode: res.statusCode
        });

        // Alert on slow requests (> 1 second)
        if (duration > 1000) {
            (req as any).logger?.warn('slow_request', {
                path: req.path,
                method: req.method,
                duration_ms: Math.round(duration * 100) / 100
            });
        }

        // Alert on high memory usage (> 50MB delta)
        if (memoryDelta > 50) {
            (req as any).logger?.warn('high_memory_usage', {
                path: req.path,
                memory_delta_mb: Math.round(memoryDelta * 100) / 100
            });
        }
    });

    next();
}
