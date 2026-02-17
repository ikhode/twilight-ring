import { Router, Request, Response } from 'express';
import { db } from '../storage';
import { sql } from 'drizzle-orm';
import { requirePermission } from '../middleware/permission_check';

const router = Router();

// System health metrics
router.get('/system', requirePermission('admin.read'), async (req: Request, res: Response) => {
  try {
    // Get database connection stats
    const dbStats = await db.execute(sql`
      SELECT 
        count(*) as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
      FROM pg_stat_activity
      WHERE state = 'active'
    `);

    // Calculate average response time from recent logs
    const perfStats = await db.execute(sql`
      SELECT 
        AVG((metadata->>'duration_ms')::numeric) as avg_response_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric) as p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric) as p99
      FROM system_logs
      WHERE event = 'performance_metric'
        AND timestamp >= NOW() - INTERVAL '1 hour'
        AND metadata->>'duration_ms' IS NOT NULL
    `);

    const metrics = {
      api: {
        uptime: '99.9%', // TODO: Calculate from actual uptime monitoring
        avg_response_ms: Math.round(perfStats.rows[0]?.avg_response_ms || 0),
        p95: Math.round(perfStats.rows[0]?.p95 || 0),
        p99: Math.round(perfStats.rows[0]?.p99 || 0)
      },
      db: {
        connections: dbStats.rows[0]?.active_connections || 0,
        max_connections: dbStats.rows[0]?.max_connections || 100
      },
      performance: {
        p95: Math.round(perfStats.rows[0]?.p95 || 0)
      }
    };

    res.json(metrics);
  } catch (error) {
    req.logger?.error('get_system_metrics_failed', error as Error);
    res.status(500).json({ message: 'Failed to fetch system metrics' });
  }
});

// Web Vitals endpoint (receives metrics from frontend)
router.post('/web-vitals', async (req: Request, res: Response) => {
  try {
    const { name, value, rating, delta, id, url } = req.body;

    await db.execute(sql`
      INSERT INTO performance_metrics (
        metric_name, value, metadata, url, session_id
      ) VALUES (
        ${name},
        ${value},
        ${JSON.stringify({ rating, delta, id })},
        ${url},
        ${id}
      )
    `);

    req.logger?.debug('web_vital_recorded', { name, value, rating });

    res.json({ success: true });
  } catch (error) {
    req.logger?.error('web_vitals_error', error as Error);
    res.status(500).json({ message: 'Failed to store web vital' });
  }
});

// Get performance metrics summary
router.get('/performance', requirePermission('admin.read'), async (req: Request, res: Response) => {
  try {
    const { metric, hours = 24 } = req.query;

    let query = sql`
      SELECT 
        metric_name,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        COUNT(*) as count
      FROM performance_metrics
      WHERE timestamp >= NOW() - INTERVAL '${sql.raw(hours as string)} hours'
    `;

    if (metric) {
      query = sql`${query} AND metric_name = ${metric}`;
    }

    query = sql`${query} GROUP BY metric_name ORDER BY metric_name`;

    const result = await db.execute(query);

    res.json({
      metrics: result.rows
    });
  } catch (error) {
    req.logger?.error('get_performance_metrics_failed', error as Error);
    res.status(500).json({ message: 'Failed to fetch performance metrics' });
  }
});

// Business metrics endpoint
router.get('/business', requirePermission('admin.read'), async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID required' });
    }

    // Sales per minute (last hour)
    const salesPerMinute = await db.execute(sql`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total), 0) as total_revenue
      FROM sales
      WHERE organization_id = ${orgId}
        AND created_at >= NOW() - INTERVAL '1 hour'
    `);

    const salesCount = Number(salesPerMinute.rows[0]?.total_sales || 0);
    const revenue = Number(salesPerMinute.rows[0]?.total_revenue || 0);
    const salesPerMin = (salesCount / 60).toFixed(2);

    // Active orders (pending/processing)
    const activeOrders = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM sales
      WHERE organization_id = ${orgId}
        AND status IN ('pending', 'processing')
    `);

    // Low stock items
    const lowStockItems = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM products
      WHERE organization_id = ${orgId}
        AND stock_quantity <= reorder_point
        AND reorder_point > 0
    `);

    // Today's revenue
    const todayRevenue = await db.execute(sql`
      SELECT COALESCE(SUM(total), 0) as revenue
      FROM sales
      WHERE organization_id = ${orgId}
        AND created_at >= CURRENT_DATE
    `);

    res.json({
      sales: {
        per_minute: parseFloat(salesPerMin),
        last_hour: salesCount,
        revenue_last_hour: revenue
      },
      orders: {
        active: Number(activeOrders.rows[0]?.count || 0)
      },
      inventory: {
        low_stock_items: Number(lowStockItems.rows[0]?.count || 0)
      },
      revenue: {
        today: Number(todayRevenue.rows[0]?.revenue || 0)
      }
    });
  } catch (error) {
    req.logger?.error('get_business_metrics_failed', error as Error);
    res.status(500).json({ message: 'Failed to fetch business metrics' });
  }
});

export default router;
