import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

/**
 * Basic in-memory rate limiter middleware.
 * In a production environment with multiple nodes, a distributed store like Redis is recommended.
 */
export function rateLimit(options: { windowMs: number; max: number }) {
    const { windowMs, max } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket.remoteAddress || "unknown";
        const now = Date.now();

        if (!store[ip] || now > store[ip].resetTime) {
            store[ip] = {
                count: 1,
                resetTime: now + windowMs,
            };
        } else {
            store[ip].count++;
        }

        if (store[ip].count > max) {
            return res.status(429).json({
                message: "Too many requests, please try again later.",
            });
        }

        // Set standard rate limit headers
        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, max - store[ip].count));
        res.setHeader("X-RateLimit-Reset", Math.round(store[ip].resetTime / 1000));

        next();
    };
}
