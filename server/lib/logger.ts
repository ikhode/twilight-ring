import { db } from "../storage";
import { sql } from "drizzle-orm";

interface LogEvent {
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
    service: 'api' | 'db' | 'auth' | 'realtime';
    traceId: string;
    userId?: string;
    organizationId?: string;
    event: string;
    metadata?: Record<string, any>;
    performance?: {
        duration_ms: number;
        memory_mb: number;
    };
    error?: {
        message: string;
        stack?: string;
        code?: string;
    };
}

function generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

class Logger {
    private context: Partial<LogEvent>;

    constructor(context: Partial<LogEvent> = {}) {
        this.context = context;
    }

    private log(level: LogEvent['level'], event: string, metadata?: any, error?: Error) {
        const logEvent: LogEvent = {
            timestamp: new Date().toISOString(),
            level,
            service: this.context.service || 'api',
            traceId: this.context.traceId || generateTraceId(),
            userId: this.context.userId,
            organizationId: this.context.organizationId,
            event,
            metadata,
            error: error ? {
                message: error.message,
                stack: error.stack,
                code: (error as any).code
            } : undefined
        };

        // Console output (development)
        if (process.env.NODE_ENV === 'development') {
            const emoji = {
                debug: '🔍',
                info: 'ℹ️',
                warn: '⚠️',
                error: '❌',
                critical: '🚨'
            }[level];
            console.log(`${emoji} [${level.toUpperCase()}] ${event}`, metadata || '');
            if (error) {
                console.error(error);
            }
        } else {
            // Production: structured JSON logs
            console.log(JSON.stringify(logEvent));
        }

        // Store critical errors in DB for dashboard
        if (level === 'error' || level === 'critical') {
            this.storeErrorLog(logEvent).catch(err => {
                console.error('Failed to store error log:', err);
            });
        }
    }

    debug(event: string, metadata?: any) {
        this.log('debug', event, metadata);
    }

    info(event: string, metadata?: any) {
        this.log('info', event, metadata);
    }

    warn(event: string, metadata?: any) {
        this.log('warn', event, metadata);
    }

    error(event: string, error?: Error, metadata?: any) {
        this.log('error', event, metadata, error);
    }

    critical(event: string, error?: Error, metadata?: any) {
        this.log('critical', event, metadata, error);
    }

    child(context: Partial<LogEvent>): Logger {
        return new Logger({ ...this.context, ...context });
    }

    private async storeErrorLog(logEvent: LogEvent) {
        // Store in system_logs table for dashboard
        try {
            await db.execute(sql`
        INSERT INTO system_logs (
          level, service, event, metadata, error, 
          user_id, organization_id, trace_id, timestamp
        ) VALUES (
          ${logEvent.level},
          ${logEvent.service},
          ${logEvent.event},
          ${JSON.stringify(logEvent.metadata || {})},
          ${JSON.stringify(logEvent.error || {})},
          ${logEvent.userId || null},
          ${logEvent.organizationId || null},
          ${logEvent.traceId},
          ${new Date(logEvent.timestamp)}
        )
      `);
        } catch (err) {
            // Don't throw - logging should never break the app
            console.error('Failed to store error log:', err);
        }
    }
}

export const logger = new Logger();
export { Logger, generateTraceId };
export type { LogEvent };
