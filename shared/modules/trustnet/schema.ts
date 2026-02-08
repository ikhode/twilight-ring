import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";

// ==========================================
// TrustNet & Marketplace Schema
// ==========================================

// Consent Types Enum
export const CONSENT_TYPES = ['share_metrics', 'public_profile', 'marketplace_participation', 'industry_benchmarks'] as const;
export type ConsentType = typeof CONSENT_TYPES[number];

// Metric Types Enum
export const METRIC_TYPES = ['payment_compliance', 'delivery_timeliness', 'dispute_rate', 'order_fulfillment', 'response_time', 'quality_score'] as const;
export type MetricType = typeof METRIC_TYPES[number];

// Marketplace Consents - LFPDPPP/GDPR Compliance
export const marketplaceConsents = pgTable("marketplace_consents", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    consentType: text("consent_type").notNull(), // share_metrics, public_profile, marketplace_participation, industry_benchmarks
    grantedAt: timestamp("granted_at").defaultNow(),
    revokedAt: timestamp("revoked_at"),
    consentVersion: text("consent_version").notNull().default("1.0"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    grantedBy: varchar("granted_by").references(() => users.id),
});

// Trust Score History - Audit Trail
export const trustScoreHistory = pgTable("trust_score_history", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(0),
    breakdown: jsonb("breakdown").default({}), // { payment_compliance: 85, delivery_timeliness: 90, ... }
    calculatedAt: timestamp("calculated_at").defaultNow(),
});

// Trust Metrics - Operational Data for Score Calculation
export const trustMetrics = pgTable("trust_metrics", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    metricType: text("metric_type").notNull(), // payment_compliance, delivery_timeliness, etc.
    value: integer("value").notNull().default(0), // Percentage (0-100) or score
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    sourceCount: integer("source_count").default(0), // Number of transactions analyzed
    isVerified: boolean("is_verified").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});

// Marketplace Listings - B2B Offerings
export const marketplaceListings = pgTable("marketplace_listings", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    minTrustScore: integer("min_trust_score").default(0), // Minimum buyer trust score required
    priceRangeMin: integer("price_range_min"), // in cents
    priceRangeMax: integer("price_range_max"), // in cents
    status: text("status").notNull().default("draft"), // draft, active, paused, sold, expired
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
});

// Marketplace Transactions - B2B Deals
export const marketplaceTransactions = pgTable("marketplace_transactions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    listingId: varchar("listing_id").references(() => marketplaceListings.id),
    buyerOrgId: varchar("buyer_org_id").notNull().references(() => organizations.id),
    sellerOrgId: varchar("seller_org_id").notNull().references(() => organizations.id),
    amount: integer("amount").notNull(), // in cents
    status: text("status").notNull().default("pending"), // pending, confirmed, in_progress, completed, disputed, cancelled
    buyerRating: integer("buyer_rating"), // 1-5
    sellerRating: integer("seller_rating"), // 1-5
    buyerReview: text("buyer_review"),
    sellerReview: text("seller_review"),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
});

// Trust Appeals - Dispute Resolution
export const trustAppeals = pgTable("trust_appeals", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    appealType: text("appeal_type").notNull(), // score_dispute, metric_error, data_correction, unfair_rating
    currentScore: integer("current_score").notNull(),
    evidence: jsonb("evidence").default({}), // { documents: [], description: "", ... }
    description: text("description"),
    status: text("status").notNull().default("pending"), // pending, under_review, approved, rejected, escalated
    reviewerId: varchar("reviewer_id").references(() => users.id),
    reviewerNotes: text("reviewer_notes"),
    resolution: text("resolution"),
    createdAt: timestamp("created_at").defaultNow(),
    resolvedAt: timestamp("resolved_at"),
});

// External Counterparties - Passive Reputation
export const externalCounterparties = pgTable("external_counterparties", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    reportingOrgId: varchar("reporting_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    externalName: text("external_name").notNull(),
    externalRfcHash: text("external_rfc_hash"), // SHA-256 hashed RFC for privacy
    relationshipType: text("relationship_type").notNull(), // supplier, customer
    passiveTrustScore: integer("passive_trust_score").default(0),
    transactionCount: integer("transaction_count").default(0),
    positiveCount: integer("positive_count").default(0),
    negativeCount: integer("negative_count").default(0),
    lastTransactionAt: timestamp("last_transaction_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Trust Audit Logs - Compliance Logging
export const trustAuditLogs = pgTable("trust_audit_logs", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => users.id),
    action: text("action").notNull(), // consent_granted, consent_revoked, score_calculated, appeal_submitted, etc.
    entityType: text("entity_type").notNull(), // consent, score, listing, transaction, appeal
    entityId: varchar("entity_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// Type Exports
// ==========================================

export type MarketplaceConsent = typeof marketplaceConsents.$inferSelect;
export type InsertMarketplaceConsent = z.infer<typeof insertMarketplaceConsentSchema>;

export type TrustScoreHistory = typeof trustScoreHistory.$inferSelect;
export type InsertTrustScoreHistory = z.infer<typeof insertTrustScoreHistorySchema>;

export type TrustMetric = typeof trustMetrics.$inferSelect;
export type InsertTrustMetric = z.infer<typeof insertTrustMetricSchema>;

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = z.infer<typeof insertMarketplaceListingSchema>;

export type MarketplaceTransaction = typeof marketplaceTransactions.$inferSelect;
export type InsertMarketplaceTransaction = z.infer<typeof insertMarketplaceTransactionSchema>;

export type TrustAppeal = typeof trustAppeals.$inferSelect;
export type InsertTrustAppeal = z.infer<typeof insertTrustAppealSchema>;

export type ExternalCounterparty = typeof externalCounterparties.$inferSelect;
export type InsertExternalCounterparty = z.infer<typeof insertExternalCounterpartySchema>;

export type TrustAuditLog = typeof trustAuditLogs.$inferSelect;
export type InsertTrustAuditLog = z.infer<typeof insertTrustAuditLogSchema>;

// ==========================================
// Insert Schemas (Zod)
// ==========================================

export const insertMarketplaceConsentSchema = createInsertSchema(marketplaceConsents).extend({
    consentType: z.enum(CONSENT_TYPES),
});

export const insertTrustScoreHistorySchema = createInsertSchema(trustScoreHistory);

export const insertTrustMetricSchema = createInsertSchema(trustMetrics).extend({
    metricType: z.enum(METRIC_TYPES),
});

export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListings);

export const insertMarketplaceTransactionSchema = createInsertSchema(marketplaceTransactions);

export const insertTrustAppealSchema = createInsertSchema(trustAppeals);

export const insertExternalCounterpartySchema = createInsertSchema(externalCounterparties);

export const insertTrustAuditLogSchema = createInsertSchema(trustAuditLogs);

// ==========================================
// Trust Score Calculation Weights
// ==========================================

export const TRUST_SCORE_WEIGHTS: Record<MetricType, number> = {
    payment_compliance: 0.25,    // 25% weight
    delivery_timeliness: 0.20,   // 20% weight
    dispute_rate: 0.20,          // 20% weight (inverse)
    order_fulfillment: 0.15,     // 15% weight
    response_time: 0.10,         // 10% weight
    quality_score: 0.10,         // 10% weight
};
