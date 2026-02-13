import { supabase } from '@/lib/supabase';

/**
 * MLDataProvider - Responsible for fetching and preparing business data for ML.
 * Ensures data isolation by filtering by organization_id.
 */
export class MLDataProvider {
    /**
     * Fetches historical sales data for time-series forecasting.
     */
    static async getHistoricalSales(organizationId: string, daysLookback = 90) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - daysLookback);

        const { data, error } = await supabase
            .from('sales')
            .select('total_price, date')
            .eq('organization_id', organizationId)
            .gte('date', dateLimit.toISOString())
            .order('date', { ascending: true });

        if (error) throw error;
        return data;
    }

    /**
     * Fetches inventory movement history for demand prediction.
     */
    static async getInventoryMovements(organizationId: string, productId: string, daysLookback = 90) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - daysLookback);

        const { data, error } = await supabase
            .from('inventory_movements')
            .select('quantity, date, type')
            .eq('organization_id', organizationId)
            .eq('product_id', productId)
            .gte('date', dateLimit.toISOString())
            .order('date', { ascending: true });

        if (error) throw error;
        return data;
    }

    /**
     * Aggregates raw data into daily buckets for ML processing.
     */
    static aggregateDaily(data: { amount?: number; quantity?: number; created_at?: string; date?: string }[]) {
        const buckets: Record<string, number> = {};

        data.forEach(item => {
            const dateStr = item.date || item.created_at || new Date().toISOString();
            const dateKey = dateStr.split('T')[0];
            const val = item.amount || item.quantity || 0;
            buckets[dateKey] = (buckets[dateKey] || 0) + val;
        });

        return Object.keys(buckets)
            .sort()
            .map(key => buckets[key]);
    }

    /**
     * Fetches transaction data for fraud detection.
     */
    static async getTransactionHistory(organizationId: string, limit = 1000) {
        const { data, error } = await supabase
            .from('sales')
            .select('id, total_price, date, customer_id')
            .eq('organization_id', organizationId)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }

    /**
     * Fetches trust metrics for credit risk calculation.
     */
    static async getTrustMetrics(organizationId: string) {
        const { data, error } = await (supabase as any)
            .from('trust_metrics')
            .select('*')
            .eq('organization_id', organizationId)
            .order('timestamp', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data;
    }

    /**
     * Fetches product and sale data for price recommendation.
     */
    static async getProductPricingData(organizationId: string) {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, price, category')
            .eq('organization_id', organizationId);

        if (error) throw error;
        return data;
    }

    /**
     * Fetches customer interaction data for segmentation.
     */
    static async getCustomerBehavior(organizationId: string) {
        const { data, error } = await supabase
            .from('sales')
            .select('customer_id, total_price, date')
            .eq('organization_id', organizationId)
            .not('customer_id', 'is', null);

        if (error) throw error;
        return data;
    }
}
