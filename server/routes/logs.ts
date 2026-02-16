import { Router, Request, Response } from 'express';
import { db } from '../storage';
import { sql } from 'drizzle-orm';
import { requirePermission } from '../middleware/permission_check';

const router = Router();

// Frontend logs endpoint (receives batched logs from client)
router.post('/frontend', async (req: Request, res: Response) => {
    try {
        const { logs } = req.body;

        if (!Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ message: 'Invalid logs format' });
        }

        // Batch insert frontend logs
        const values = logs.map((log: any) => ({
            timestamp: new Date(log.timestamp),
            level: log.level,
            event: log.event,
            metadata: log.metadata || {},
            userAgent: log.userAgent,
            url: log.url,
            sessionId: log.sessionId
        }));

        for (const value of values) {
            await db.execute(sql`
        INSERT INTO frontend_logs (
          timestamp, level, event, metadata, user_agent, url, session_id
        ) VALUES (
          ${value.timestamp},
          ${value.level},
          ${value.event},
          ${JSON.stringify(value.metadata)},
          ${value.userAgent},
          ${value.url},
          ${value.sessionId}
        )
      `);
        }

        req.logger?.debug('frontend_logs_received', { count: logs.length });

        res.json({ success: true, count: logs.length });
    } catch (error) {
        req.logger?.error('frontend_logs_error', error as Error);
        res.status(500).json({ message: 'Failed to store logs' });
    }
});

// Get recent errors (for dashboard)
router.get('/errors', requirePermission('admin.read'), async (req: Request, res: Response) => {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const result = await db.execute(sql`
      SELECT *
      FROM system_logs
      WHERE level IN ('error', 'critical')
        AND timestamp >= ${last24h}
      ORDER BY timestamp DESC
      LIMIT 50
    `);

        const errors = result.rows;
        const count = errors.length;
        const critical = errors.filter((e: any) => e.level === 'critical').length;

        res.json({
            count,
            critical,
            recent: errors
        });
    } catch (error) {
        req.logger?.error('get_errors_failed', error as Error);
        res.status(500).json({ message: 'Failed to fetch errors' });
    }
});

// Get system logs with filters
router.get('/system', requirePermission('admin.read'), async (req: Request, res: Response) => {
    try {
        const { level, service, limit = 100 } = req.query;

        let query = sql`
      SELECT *
      FROM system_logs
      WHERE 1=1
    `;

        if (level) {
            query = sql`${query} AND level = ${level}`;
        }

        if (service) {
            query = sql`${query} AND service = ${service}`;
        }

        query = sql`${query} ORDER BY timestamp DESC LIMIT ${parseInt(limit as string)}`;

        const result = await db.execute(query);

        res.json({
            logs: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        req.logger?.error('get_system_logs_failed', error as Error);
        res.status(500).json({ message: 'Failed to fetch system logs' });
    }
});

export default router;
