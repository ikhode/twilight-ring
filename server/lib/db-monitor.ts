import { Pool, PoolClient, QueryResult } from 'pg';
import { tracker } from './observability';

/**
 * Wraps a PostgreSQL pool to monitor query performance and pool health.
 * 
 * Features:
 * - Logs slow queries (> 100ms)
 * - Logs critical slow queries (> 1000ms)
 * - Monitors pool events (connect, acquire, error)
 * - Periodically logs pool statistics (total, idle, waiting)
 */
export function monitorPool(pool: Pool) {
    // 1. Monkey-patch pool.query to measure execution time
    const originalQuery = pool.query.bind(pool);

    // @ts-ignore - Overriding functionality
    pool.query = async (text: string | any, params?: any[]) => {
        const start = performance.now();
        try {
            const result = await originalQuery(text, params);
            const duration = performance.now() - start;

            const queryString = typeof text === 'string' ? text : text.text;

            // Log slow queries
            if (duration > 100) {
                const level = duration > 1000 ? 'error' : 'warn';
                tracker.dbQuery(duration, queryString, true, level);
            }

            return result;
        } catch (error: any) {
            const duration = performance.now() - start;
            const queryString = typeof text === 'string' ? text : text.text;

            tracker.dbQuery(duration, queryString, false, 'error', error);

            // Check for deadlock (Postgres error 40P01)
            if (error.code === '40P01') {
                tracker.error(new Error(`DEADLOCK DETECTED: ${queryString}`), {
                    code: error.code,
                    detail: error.detail,
                    hint: error.hint
                });
            }

            throw error;
        }
    };

    // 2. Monitor Pool Events
    pool.on('connect', () => {
        // Optional: Log every new connection (can be noisy)
        // tracker.info('DB: New client connected');
    });

    pool.on('error', (err) => {
        tracker.error(new Error('DB: Idle client error'), err);
    });

    // 3. Periodic Pool Stats Logging (every 60s)
    setInterval(() => {
        tracker.info('DB Pool Stats', {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
        });

        // Alert on critical waiting count
        if (pool.waitingCount > 5) {
            tracker.error(new Error('CRITICAL: High DB waiting count'), {
                waiting: pool.waitingCount,
                total: pool.totalCount,
                idle: pool.idleCount
            });
        }
    }, 60000);

    console.log('✅ Database monitoring initialized');
}
