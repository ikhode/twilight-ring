interface FrontendLogEvent {
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    event: string;
    metadata?: Record<string, any>;
    userAgent: string;
    url: string;
    sessionId: string;
}

class FrontendLogger {
    private sessionId: string;
    private logQueue: FrontendLogEvent[] = [];
    private queueTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.sessionId = this.getOrCreateSessionId();

        // Flush logs before page unload
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.flushLogs());
        }
    }

    private getOrCreateSessionId(): string {
        if (typeof sessionStorage === 'undefined') return 'server_session';

        let sessionId = sessionStorage.getItem('log_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('log_session_id', sessionId);
        }
        return sessionId;
    }

    private log(level: FrontendLogEvent['level'], event: string, metadata?: any) {
        const logEvent: FrontendLogEvent = {
            timestamp: new Date().toISOString(),
            level,
            event,
            metadata,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'unknown',
            sessionId: this.sessionId
        };

        // Console output in development
        if (import.meta.env.DEV) {
            const emoji = {
                debug: '🔍',
                info: 'ℹ️',
                warn: '⚠️',
                error: '❌'
            }[level];
            console.log(`${emoji} [${level.toUpperCase()}]`, event, metadata || '');
        }

        // Queue for batch sending
        this.queueLog(logEvent);
    }

    private queueLog(logEvent: FrontendLogEvent) {
        this.logQueue.push(logEvent);

        // Flush immediately for errors, or when queue is full
        if (logEvent.level === 'error' || this.logQueue.length >= 10) {
            this.flushLogs();
        } else if (!this.queueTimer) {
            // Otherwise flush after 30 seconds
            this.queueTimer = setTimeout(() => this.flushLogs(), 30000);
        }
    }

    private async flushLogs() {
        if (this.logQueue.length === 0) return;

        const logs = [...this.logQueue];
        this.logQueue = [];

        if (this.queueTimer) {
            clearTimeout(this.queueTimer);
            this.queueTimer = null;
        }

        try {
            await fetch('/api/logs/frontend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs }),
                keepalive: true // Important for beforeunload
            });
        } catch (err) {
            // Silently fail - don't want logging to break the app
            if (import.meta.env.DEV) {
                console.error('Failed to send logs:', err);
            }
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
        this.log('error', event, {
            ...metadata,
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : undefined
        });
    }
}

export const frontendLogger = new FrontendLogger();
