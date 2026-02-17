import "dotenv/config";

// Initialize Sentry FIRST before any other imports
import { initSentry } from "./lib/sentry";
initSentry();

import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { rateLimit } from "./middleware/security";
import { healthCheck, errorMiddleware } from "./lib/observability";

const app = express();
const httpServer = createServer(app);

// Apply global rate limiting: 5000 requests per 15 minutes
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 5000 }));

// Health check endpoint
app.get("/health", healthCheck);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(cookieParser()); // Phase 2: Cookie parser for auth

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

import { logger, generateTraceId } from "./lib/logger";
import { performanceMiddleware } from "./middleware/performance";

// Extend Express Request type to include logger
declare global {
  namespace Express {
    interface Request {
      logger: typeof logger;
    }
  }
}

// Request logging middleware with trace IDs
app.use((req, res, next) => {
  const traceId = (req.headers['x-trace-id'] as string) || generateTraceId();

  // Attach logger to request with trace context
  req.logger = logger.child({
    traceId,
    service: 'api'
  });

  // Set trace ID in response headers for debugging
  res.setHeader('X-Trace-ID', traceId);

  // Log incoming request
  req.logger.info('http_request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  next();
});

// Performance monitoring middleware
app.use(performanceMiddleware);

import { guardian } from "./services/guardian";

(async () => {
  await registerRoutes(httpServer, app);

  // Start the Cognitive Guardian
  guardian.start();

  // Unified production error tracking
  app.use(errorMiddleware);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
