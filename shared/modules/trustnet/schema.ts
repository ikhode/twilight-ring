import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, users } from "../../core/schema";

// ==========================================
// TrustNet & Marketplace Schema
// ==========================================

// ==========================================
// TrustNet & Marketplace Schema
// ==========================================

// Consent Types Enum
export const CONSENT_TYPES = [
    'share_metrics',
    'public_profile',
    'marketplace_participation',
    'industry_benchmarks',
    'external_verification'
] as const;
export type ConsentType = typeof CONSENT_TYPES[number];

// Metric Names Enum
export const TRUST_METRIC_NAMES = [
    'payment_punctuality',
    'sales_volume',
    'customer_retention',
    'inventory_turnover',
    'order_fulfillment',
    'return_rate',
    'credit_compliance',
    'business_age',
    'transaction_volume'
] as const;
export type TrustMetricName = typeof TRUST_METRIC_NAMES[number];

// Trust Levels Enum
export const TRUST_LEVELS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type TrustLevel = typeof TRUST_LEVELS[number];

// Trust Profiles - Reputation state of each organization
export const trustProfiles = pgTable("trust_profiles", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    trustScore: integer("trust_score").notNull().default(0),
    trustLevel: text("trust_level").notNull().default("bronze"),
    lastScoreUpdate: timestamp("last_score_update").defaultNow(),
    calculationMethod: text("calculation_method").default("Cognitive Risk v1"),
    verificationStatus: text("verification_status").notNull().default("unverified"), // unverified, pending, verified
    marketplaceActive: boolean("marketplace_active").default(false),
    industry: text("industry"),
    foundedYear: integer("founded_year"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Privacy Settings - Granular control (Consolidating marketplace_consents)
export const trustPrivacySettings = pgTable("trust_privacy_settings", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    permissionType: text("permission_type").notNull(), // from CONSENT_TYPES
    isActive: boolean("is_active").default(true),
    grantedAt: timestamp("granted_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    scope: text("scope"), // "all", "restricted", "anonymized"
    createdAt: timestamp("created_at").defaultNow(),
});

// Trust Metrics - Operational data feeding the score
export const trustMetrics = pgTable("trust_metrics", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    metricName: text("metric_name").notNull(), // from TRUST_METRIC_NAMES
    metricValue: integer("metric_value").notNull().default(0),
    metricWeight: integer("metric_weight").default(10), // weighted importance
    dataSource: text("data_source"), // sales, payments, inventory
    verificationStatus: text("verification_status").default("unverified"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: varchar("verified_by").references(() => users.id),
    timestamp: timestamp("timestamp").defaultNow(),
});

// Marketplace Listings - B2B Offerings
export const marketplaceListings = pgTable("marketplace_listings", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sellerId: varchar("seller_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    productId: varchar("product_id"), // Optional ERP inventory link
    productName: text("product_name").notNull(),
    description: text("description"),
    category: text("category"),
    price: integer("price").notNull(), // in cents
    currency: varchar("currency", { length: 3 }).default("USD"),
    quantityAvailable: integer("quantity_available").default(0),
    unitType: text("unit_type"), // units, kg, liters, etc.
    images: jsonb("images").default([]),
    sellerTrustScore: integer("seller_trust_score"), // snapshot at listing
    minOrderQty: integer("min_order_qty").default(1),
    deliveryTimeDays: integer("delivery_time_days"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Marketplace Offers - Negotiations between parties
export const marketplaceOffers = pgTable("marketplace_offers", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    listingId: varchar("listing_id").notNull().references(() => marketplaceListings.id, { onDelete: "cascade" }),
    buyerId: varchar("buyer_id").notNull().references(() => organizations.id),
    sellerId: varchar("seller_id").notNull().references(() => organizations.id),
    qtyRequested: integer("qty_requested").notNull(),
    pricePerUnit: integer("price_per_unit").notNull(),
    totalPrice: integer("total_price").notNull(),
    deliveryLocation: text("delivery_location"),
    requiredDate: timestamp("required_date"),
    status: text("status").notNull().default("pending"), // pending, accepted, rejected, completed, cancelled
    terms: jsonb("terms"), // Escrow, payment terms, warranties
    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Trust Transactions - Verified marketplace completions
export const trustTransactions = pgTable("trust_transactions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    offerId: varchar("offer_id").references(() => marketplaceOffers.id),
    buyerId: varchar("buyer_id").notNull().references(() => organizations.id),
    sellerId: varchar("seller_id").notNull().references(() => organizations.id),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).default("USD"),
    status: text("status").notNull().default("initiated"), // initiated, payment_pending, delivered, completed, disputed, refunded
    deliveryStatus: text("delivery_status"),
    deliveryProof: text("delivery_proof"),
    paymentMethod: text("payment_method"),
    paymentVerifiedAt: timestamp("payment_verified_at"),
    deliveryVerifiedAt: timestamp("delivery_verified_at"),
    transactionHash: text("transaction_hash"),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
});

// Trust Reviews - Peer reviews for reputation
export const trustReviews = pgTable("trust_reviews", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    transactionId: varchar("transaction_id").references(() => trustTransactions.id),
    reviewerId: varchar("reviewer_id").notNull().references(() => organizations.id),
    reviewedId: varchar("reviewed_id").notNull().references(() => organizations.id),
    rating: integer("rating").notNull(), // 1-5
    reviewText: text("review_text"),
    categoriesRating: jsonb("categories_rating"), // {communication: 5, quality: 4...}
    verifiedPurchase: boolean("verified_purchase").default(true),
    isPublic: boolean("is_public").default(true),
    createdAt: timestamp("created_at").defaultNow(),
});

// Benchmark Data - Anonymous industry standings
export const benchmarkData = pgTable("benchmark_data", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    industry: text("industry").notNull(),
    country: text("country").notNull().default("MX"),
    metricName: text("metric_name").notNull(),
    averageValue: integer("average_value"),
    medianValue: integer("median_value"),
    percentile25: integer("percentile_25"),
    percentile75: integer("percentile_75"),
    totalCompanies: integer("total_companies"),
    dataPointsCount: integer("data_points_count"),
    calculationDate: timestamp("calculation_date").defaultNow(),
});

// External Verifications - 3rd party validations
export const externalVerifications = pgTable("external_verifications", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    verificationType: text("verification_type").notNull(), // tax_compliance, census, bank, references
    externalEntity: text("external_entity"),
    status: text("status").notNull().default("pending"), // pending, sent, received, verified
    result: jsonb("result"),
    scoreImpact: integer("score_impact").default(0),
    verifiedAt: timestamp("verified_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Trust Appeals - Correction and dispute logic
export const trustAppeals = pgTable("trust_appeals", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    appealType: text("appeal_type").notNull(), // score_dispute, metric_correction, privacy, transaction
    reason: text("reason"),
    supportingDocs: jsonb("supporting_docs").default([]),
    status: text("status").notNull().default("submitted"), // submitted, under_review, accepted, rejected, resolved
    reviewerId: varchar("reviewer_id").references(() => users.id),
    reviewerNotes: text("reviewer_notes"),
    resolutionDate: timestamp("resolution_date"),
    appealImpact: jsonb("appeal_impact"), // {score_change: +5}
    createdAt: timestamp("created_at").defaultNow(),
});

// Trust Score History - Evolution tracking
export const trustScoreHistory = pgTable("trust_score_history", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    previousScore: integer("previous_score"),
    newScore: integer("new_score").notNull(),
    reason: text("reason"),
    metricsUsed: jsonb("metrics_used"),
    changedAt: timestamp("changed_at").defaultNow(),
});

// ==========================================
// Type Exports
// ==========================================

export type TrustProfile = typeof trustProfiles.$inferSelect;
export type TrustPrivacySetting = typeof trustPrivacySettings.$inferSelect;
export type TrustMetric = typeof trustMetrics.$inferSelect;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type MarketplaceOffer = typeof marketplaceOffers.$inferSelect;
export type TrustTransaction = typeof trustTransactions.$inferSelect;
export type TrustReview = typeof trustReviews.$inferSelect;
export type BenchmarkData = typeof benchmarkData.$inferSelect;
export type ExternalVerification = typeof externalVerifications.$inferSelect;
export type TrustAppeal = typeof trustAppeals.$inferSelect;
export type TrustScoreHistory = typeof trustScoreHistory.$inferSelect;

// ==========================================
// Insert Schemas (Zod)
// ==========================================

export const insertTrustProfileSchema = createInsertSchema(trustProfiles);
export const insertTrustPrivacySettingSchema = createInsertSchema(trustPrivacySettings);
export const insertTrustMetricSchema = createInsertSchema(trustMetrics);
export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListings);
export const insertMarketplaceOfferSchema = createInsertSchema(marketplaceOffers);
export const insertTrustTransactionSchema = createInsertSchema(trustTransactions);
export const insertTrustReviewSchema = createInsertSchema(trustReviews);
export const insertBenchmarkDataSchema = createInsertSchema(benchmarkData);
export const insertExternalVerificationSchema = createInsertSchema(externalVerifications);
export const insertTrustAppealSchema = createInsertSchema(trustAppeals);
export const insertTrustScoreHistorySchema = createInsertSchema(trustScoreHistory);

// ==========================================
// Trust Score Calculation Weights
// ==========================================

export const TRUST_SCORE_WEIGHTS: Record<TrustMetricName, number> = {
    payment_punctuality: 0.25,
    sales_volume: 0.15,
    customer_retention: 0.15,
    inventory_turnover: 0.10,
    order_fulfillment: 0.15,
    return_rate: 0.05,
    credit_compliance: 0.10,
    business_age: 0.05, // as weight bonus
    transaction_volume: 0.05,
};
