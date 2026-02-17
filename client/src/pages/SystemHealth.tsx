import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, Database, Zap, AlertTriangle, RefreshCw, TrendingUp, ShoppingCart, Package, DollarSign, Info } from 'lucide-react';
import { useState } from 'react';

interface SystemMetrics {
    api: {
        uptime: string;
        avg_response_ms: number;
        p95: number;
        p99: number;
    };
    db: {
        connections: number;
        max_connections: number;
    };
    performance: {
        p95: number;
    };
}

interface BusinessMetrics {
    sales: {
        per_minute: number;
        last_hour: number;
        revenue_last_hour: number;
    };
    orders: {
        active: number;
    };
    inventory: {
        low_stock_items: number;
    };
    revenue: {
        today: number;
    };
}

interface ErrorLog {
    id: string;
    timestamp: string;
    level: 'error' | 'critical';
    event: string;
    error?: {
        message: string;
        stack?: string;
    };
    metadata?: any;
    traceId?: string;
}

interface ErrorsResponse {
    count: number;
    critical: number;
    recent: ErrorLog[];
}

export default function SystemHealth() {
    const [expandedError, setExpandedError] = useState<string | null>(null);

    const { data: metrics, isLoading: metricsLoading } = useQuery<SystemMetrics>({
        queryKey: ['/api/metrics/system'],
        refetchInterval: 5000, // Refresh every 5 seconds
    });

    const { data: business, isLoading: businessLoading } = useQuery<BusinessMetrics>({
        queryKey: ['/api/metrics/business'],
        refetchInterval: 5000, // Refresh every 5 seconds
    });

    const { data: errors, isLoading: errorsLoading } = useQuery<ErrorsResponse>({
        queryKey: ['/api/logs/errors'],
        refetchInterval: 10000, // Refresh every 10 seconds
    });

    const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
        if (value >= thresholds.critical) return 'text-red-500';
        if (value >= thresholds.warning) return 'text-yellow-500';
        return 'text-green-500';
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">System Health</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Auto-refreshing</span>
                </div>
            </div>

            {/* Business Metrics Section */}
            <div>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Business Metrics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Sales Per Minute */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Sales/Minute</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-semibold">Sales per Minute</p>
                                    <p className="text-xs mt-1">Average number of sales transactions per minute in the last hour.</p>
                                    <p className="text-xs mt-1"><strong>Formula:</strong> Total sales in last hour ÷ 60</p>
                                    <p className="text-xs mt-1"><strong>Source:</strong> sales table (last 60 minutes)</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            {businessLoading ? (
                                <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold text-green-600">
                                        {business?.sales?.per_minute.toFixed(2) || '0.00'}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {business?.sales?.last_hour || 0} sales last hour
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        ${business?.sales?.revenue_last_hour.toFixed(2) || '0.00'} revenue
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Active Orders */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <ShoppingCart className="h-4 w-4 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-semibold">Active Orders</p>
                                    <p className="text-xs mt-1">Number of orders currently being processed or pending.</p>
                                    <p className="text-xs mt-1"><strong>Formula:</strong> COUNT(sales WHERE status IN ('pending', 'processing'))</p>
                                    <p className="text-xs mt-1"><strong>Source:</strong> sales table</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            {businessLoading ? (
                                <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {business?.orders?.active || 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Orders in progress
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Low Stock Items */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Package className={`h-4 w-4 ${(business?.inventory?.low_stock_items || 0) > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-semibold">Low Stock Items</p>
                                    <p className="text-xs mt-1">Products at or below their reorder point threshold.</p>
                                    <p className="text-xs mt-1"><strong>Formula:</strong> COUNT(products WHERE stock_quantity ≤ reorder_point)</p>
                                    <p className="text-xs mt-1"><strong>Source:</strong> products table</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            {businessLoading ? (
                                <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
                            ) : (
                                <>
                                    <div className={`text-2xl font-bold ${(business?.inventory?.low_stock_items || 0) > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                                        {business?.inventory?.low_stock_items || 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {(business?.inventory?.low_stock_items || 0) === 0 ? '✓ Stock levels healthy' : '⚠ Needs attention'}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Today's Revenue */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <DollarSign className="h-4 w-4 text-green-500" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-semibold">Today's Revenue</p>
                                    <p className="text-xs mt-1">Total revenue from all sales since midnight today.</p>
                                    <p className="text-xs mt-1"><strong>Formula:</strong> SUM(sales.total WHERE created_at ≥ CURRENT_DATE)</p>
                                    <p className="text-xs mt-1"><strong>Source:</strong> sales table</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            {businessLoading ? (
                                <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold text-green-600">
                                        ${business?.revenue?.today.toFixed(2) || '0.00'}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Since midnight
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* System Metrics Section */}
            <div>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Metrics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* API Status Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">API Status</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Activity className="h-4 w-4 text-green-500" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-semibold">API Status</p>
                                    <p className="text-xs mt-1">System uptime and API response times.</p>
                                    <p className="text-xs mt-1"><strong>Avg:</strong> Average response time across all requests</p>
                                    <p className="text-xs mt-1"><strong>P95:</strong> 95% of requests complete within this time</p>
                                    <p className="text-xs mt-1"><strong>P99:</strong> 99% of requests complete within this time</p>
                                    <p className="text-xs mt-1"><strong>Source:</strong> performance_metrics table (last hour)</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            {metricsLoading ? (
                                <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">
                                        {metrics?.api?.uptime || '99.9%'}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Avg: {metrics?.api?.avg_response_ms || 0}ms
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        P95: {metrics?.api?.p95 || 0}ms | P99: {metrics?.api?.p99 || 0}ms
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Database Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Database</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Database className="h-4 w-4 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-semibold">Database Connections</p>
                                    <p className="text-xs mt-1">Number of active database connections vs. maximum allowed.</p>
                                    <p className="text-xs mt-1"><strong>Formula:</strong> COUNT(pg_stat_activity WHERE state = 'active')</p>
                                    <p className="text-xs mt-1"><strong>Source:</strong> PostgreSQL pg_stat_activity</p>
                                    <p className="text-xs mt-1"><strong>Warning:</strong> High connection usage may indicate connection leaks</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            {metricsLoading ? (
                                <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">
                                        {metrics?.db?.connections || 0} / {metrics?.db?.max_connections || 100}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Active connections
                                    </p>
                                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition-all"
                                            style={{
                                                width: `${((metrics?.db?.connections || 0) / (metrics?.db?.max_connections || 100)) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Performance Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Performance</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-semibold">P95 Latency</p>
                                    <p className="text-xs mt-1">95th percentile response time - 95% of requests complete faster than this.</p>
                                    <p className="text-xs mt-1"><strong>Thresholds:</strong></p>
                                    <p className="text-xs">• &lt;500ms: Excellent ✓</p>
                                    <p className="text-xs">• 500-1000ms: Warning ⚠</p>
                                    <p className="text-xs">• &gt;1000ms: Critical ✗</p>
                                    <p className="text-xs mt-1"><strong>Source:</strong> system_logs (last hour)</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            {metricsLoading ? (
                                <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
                            ) : (
                                <>
                                    <div className={`text-2xl font-bold ${getStatusColor(metrics?.performance?.p95 || 0, { warning: 500, critical: 1000 })}`}>
                                        {metrics?.performance?.p95 || 0}ms
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        P95 latency
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {(metrics?.performance?.p95 || 0) < 500 ? '✓ Excellent' : (metrics?.performance?.p95 || 0) < 1000 ? '⚠ Warning' : '✗ Critical'}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Errors Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Errors (24h)</CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <AlertTriangle className={`h-4 w-4 ${(errors?.critical || 0) > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-semibold">Error Count</p>
                                    <p className="text-xs mt-1">Total errors and critical issues in the last 24 hours.</p>
                                    <p className="text-xs mt-1"><strong>Formula:</strong> COUNT(system_logs WHERE level IN ('error', 'critical'))</p>
                                    <p className="text-xs mt-1"><strong>Source:</strong> system_logs table</p>
                                    <p className="text-xs mt-1"><strong>Critical:</strong> Errors requiring immediate attention</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            {errorsLoading ? (
                                <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
                            ) : (
                                <>
                                    <div className={`text-2xl font-bold ${(errors?.count || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {errors?.count || 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {errors?.critical || 0} critical
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {(errors?.count || 0) === 0 ? '✓ All systems operational' : '⚠ Issues detected'}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Recent Errors Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Errors</CardTitle>
                </CardHeader>
                <CardContent>
                    {errorsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading errors...</div>
                    ) : errors?.recent && errors.recent.length > 0 ? (
                        <div className="space-y-2">
                            {errors.recent.map((error) => (
                                <div key={error.id} className="border rounded-lg overflow-hidden">
                                    <div
                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant={error.level === 'critical' ? 'destructive' : 'secondary'}>
                                                    {error.level}
                                                </Badge>
                                                <span className="font-medium">{error.event}</span>
                                                {error.traceId && (
                                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                        {error.traceId.substring(0, 8)}...
                                                    </code>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {error.error?.message || 'No error message'}
                                            </p>
                                        </div>
                                        <span className="text-xs text-muted-foreground ml-4">
                                            {new Date(error.timestamp).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Expandable Details */}
                                    {expandedError === error.id && (
                                        <div className="p-3 bg-gray-50 border-t">
                                            <div className="space-y-2">
                                                {error.error?.stack && (
                                                    <div>
                                                        <p className="text-xs font-semibold mb-1">Stack Trace:</p>
                                                        <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-auto max-h-64">
                                                            {error.error.stack}
                                                        </pre>
                                                    </div>
                                                )}
                                                {error.metadata && Object.keys(error.metadata).length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold mb-1">Metadata:</p>
                                                        <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-auto">
                                                            {JSON.stringify(error.metadata, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                            <p>No errors in the last 24 hours</p>
                            <p className="text-xs">All systems operational ✓</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
