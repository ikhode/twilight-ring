import { Router } from "express";
import { getOrgIdFromRequest, getUserIdFromRequest } from "../auth_util";
import { consentManager } from "../services/consent-manager";
import { db } from "../storage";
import {
    marketplaceListings,
    marketplaceTransactions,
    externalCounterparties,
    trustParticipants,
    organizations,
    trustAuditLogs
} from "@shared/schema";
import { eq, desc, and, gte, ne, or, sql } from "drizzle-orm";

const router = Router();

// ==========================================
// Marketplace Listings
// ==========================================

// Get all active listings (filtered by caller's trust score)
router.get("/listings", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        // Check marketplace participation consent
        const hasConsent = await consentManager.checkConsent(orgId, 'marketplace_participation');
        if (!hasConsent) {
            return res.status(403).json({
                error: "Consent required",
                message: "You must grant marketplace participation consent to view listings"
            });
        }

        // Get caller's trust score
        const [caller] = await db.select()
            .from(trustParticipants)
            .where(eq(trustParticipants.organizationId, orgId));

        const callerScore = caller?.trustScore ?? 0;

        // Get all active listings where caller meets min trust score requirement
        const listings = await db.select({
            id: marketplaceListings.id,
            title: marketplaceListings.title,
            description: marketplaceListings.description,
            category: marketplaceListings.category,
            minTrustScore: marketplaceListings.minTrustScore,
            priceRangeMin: marketplaceListings.priceRangeMin,
            priceRangeMax: marketplaceListings.priceRangeMax,
            status: marketplaceListings.status,
            createdAt: marketplaceListings.createdAt,
            expiresAt: marketplaceListings.expiresAt,
            // Seller info (anonymized unless public profile consent)
            sellerOrgId: marketplaceListings.organizationId,
            sellerName: organizations.name,
            sellerScore: trustParticipants.trustScore,
            sellerStatus: trustParticipants.status,
        })
            .from(marketplaceListings)
            .innerJoin(organizations, eq(organizations.id, marketplaceListings.organizationId))
            .leftJoin(trustParticipants, eq(trustParticipants.organizationId, marketplaceListings.organizationId))
            .where(and(
                eq(marketplaceListings.status, 'active'),
                ne(marketplaceListings.organizationId, orgId), // Don't show own listings
                or(
                    sql`${marketplaceListings.minTrustScore} IS NULL`,
                    sql`${marketplaceListings.minTrustScore} <= ${callerScore}`
                )
            ))
            .orderBy(desc(marketplaceListings.createdAt))
            .limit(50);

        res.json(listings);
    } catch (error) {
        console.error("Error fetching listings:", error);
        res.status(500).json({ error: "Failed to fetch listings" });
    }
});

// Get own listings
router.get("/listings/my", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const listings = await db.select()
            .from(marketplaceListings)
            .where(eq(marketplaceListings.organizationId, orgId))
            .orderBy(desc(marketplaceListings.createdAt));

        res.json(listings);
    } catch (error) {
        console.error("Error fetching own listings:", error);
        res.status(500).json({ error: "Failed to fetch own listings" });
    }
});

// Create a new listing
router.post("/listings", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        const userId = await getUserIdFromRequest(req);
        if (!orgId || !userId) return res.status(401).json({ error: "Unauthorized" });

        // Check marketplace participation consent
        const hasConsent = await consentManager.checkConsent(orgId, 'marketplace_participation');
        if (!hasConsent) {
            return res.status(403).json({
                error: "Consent required",
                message: "You must grant marketplace participation consent to create listings"
            });
        }

        const { title, description, category, minTrustScore, priceRangeMin, priceRangeMax, expiresAt } = req.body;

        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        const [listing] = await db.insert(marketplaceListings).values({
            organizationId: orgId,
            title,
            description,
            category,
            minTrustScore: minTrustScore ?? 0,
            priceRangeMin,
            priceRangeMax,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            status: 'draft'
        }).returning();

        // Log audit
        await db.insert(trustAuditLogs).values({
            organizationId: orgId,
            userId,
            action: 'listing_created',
            entityType: 'listing',
            entityId: listing.id,
            newValue: { title, category }
        });

        res.json(listing);
    } catch (error) {
        console.error("Error creating listing:", error);
        res.status(500).json({ error: "Failed to create listing" });
    }
});

// Update listing status (publish, pause, etc.)
router.patch("/listings/:id/status", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        const { status } = req.body;

        if (!['draft', 'active', 'paused', 'sold', 'expired'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        // Verify ownership
        const [existing] = await db.select()
            .from(marketplaceListings)
            .where(and(
                eq(marketplaceListings.id, id),
                eq(marketplaceListings.organizationId, orgId)
            ));

        if (!existing) {
            return res.status(404).json({ error: "Listing not found" });
        }

        const [updated] = await db.update(marketplaceListings)
            .set({ status, updatedAt: new Date() })
            .where(eq(marketplaceListings.id, id))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("Error updating listing status:", error);
        res.status(500).json({ error: "Failed to update listing status" });
    }
});

// ==========================================
// Marketplace Transactions
// ==========================================

// Initiate a transaction (express interest in a listing)
router.post("/transactions", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        const userId = await getUserIdFromRequest(req);
        if (!orgId || !userId) return res.status(401).json({ error: "Unauthorized" });

        const { listingId, proposedAmount } = req.body;

        if (!listingId) {
            return res.status(400).json({ error: "listingId is required" });
        }

        // Get listing details
        const [listing] = await db.select()
            .from(marketplaceListings)
            .where(eq(marketplaceListings.id, listingId));

        if (!listing) {
            return res.status(404).json({ error: "Listing not found" });
        }

        if (listing.status !== 'active') {
            return res.status(400).json({ error: "Listing is not active" });
        }

        if (listing.organizationId === orgId) {
            return res.status(400).json({ error: "Cannot transact with your own listing" });
        }

        // Check buyer's trust score meets minimum
        const [buyer] = await db.select()
            .from(trustParticipants)
            .where(eq(trustParticipants.organizationId, orgId));

        if ((buyer?.trustScore ?? 0) < (listing.minTrustScore ?? 0)) {
            return res.status(403).json({
                error: "Insufficient trust score",
                required: listing.minTrustScore,
                current: buyer?.trustScore ?? 0
            });
        }

        const [transaction] = await db.insert(marketplaceTransactions).values({
            listingId,
            buyerOrgId: orgId,
            sellerOrgId: listing.organizationId,
            amount: proposedAmount ?? listing.priceRangeMin ?? 0,
            status: 'pending'
        }).returning();

        // Log audit
        await db.insert(trustAuditLogs).values({
            organizationId: orgId,
            userId,
            action: 'transaction_initiated',
            entityType: 'transaction',
            entityId: transaction.id,
            newValue: { listingId, amount: transaction.amount }
        });

        res.json(transaction);
    } catch (error) {
        console.error("Error initiating transaction:", error);
        res.status(500).json({ error: "Failed to initiate transaction" });
    }
});

// Get transactions (as buyer or seller)
router.get("/transactions", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const transactions = await db.select()
            .from(marketplaceTransactions)
            .where(or(
                eq(marketplaceTransactions.buyerOrgId, orgId),
                eq(marketplaceTransactions.sellerOrgId, orgId)
            ))
            .orderBy(desc(marketplaceTransactions.createdAt));

        res.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});

// Update transaction status (confirm, complete, dispute, cancel)
router.patch("/transactions/:id/status", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        const { status } = req.body;

        if (!['confirmed', 'in_progress', 'completed', 'disputed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        // Verify participation
        const [existing] = await db.select()
            .from(marketplaceTransactions)
            .where(and(
                eq(marketplaceTransactions.id, id),
                or(
                    eq(marketplaceTransactions.buyerOrgId, orgId),
                    eq(marketplaceTransactions.sellerOrgId, orgId)
                )
            ));

        if (!existing) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        const updates: any = { status };
        if (status === 'completed') {
            updates.completedAt = new Date();
        }

        const [updated] = await db.update(marketplaceTransactions)
            .set(updates)
            .where(eq(marketplaceTransactions.id, id))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("Error updating transaction status:", error);
        res.status(500).json({ error: "Failed to update transaction status" });
    }
});

// Rate a completed transaction
router.post("/transactions/:id/rate", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        const { rating, review } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // Get transaction
        const [transaction] = await db.select()
            .from(marketplaceTransactions)
            .where(eq(marketplaceTransactions.id, id));

        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        if (transaction.status !== 'completed') {
            return res.status(400).json({ error: "Can only rate completed transactions" });
        }

        // Determine if caller is buyer or seller
        const isBuyer = transaction.buyerOrgId === orgId;
        const isSeller = transaction.sellerOrgId === orgId;

        if (!isBuyer && !isSeller) {
            return res.status(403).json({ error: "Not a participant in this transaction" });
        }

        const updates: any = {};
        if (isBuyer) {
            updates.sellerRating = rating;  // Buyer rates seller
            updates.buyerReview = review;
        } else {
            updates.buyerRating = rating;   // Seller rates buyer
            updates.sellerReview = review;
        }

        const [updated] = await db.update(marketplaceTransactions)
            .set(updates)
            .where(eq(marketplaceTransactions.id, id))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("Error rating transaction:", error);
        res.status(500).json({ error: "Failed to rate transaction" });
    }
});

// ==========================================
// External Counterparties (Passive Reputation)
// ==========================================

// Get external counterparties for the organization
router.get("/counterparties", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const counterparties = await db.select()
            .from(externalCounterparties)
            .where(eq(externalCounterparties.reportingOrgId, orgId))
            .orderBy(desc(externalCounterparties.updatedAt));

        res.json(counterparties);
    } catch (error) {
        console.error("Error fetching counterparties:", error);
        res.status(500).json({ error: "Failed to fetch counterparties" });
    }
});

// Add or update external counterparty
router.post("/counterparties", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const { externalName, externalRfcHash, relationshipType, isPositive } = req.body;

        if (!externalName || !relationshipType) {
            return res.status(400).json({ error: "externalName and relationshipType are required" });
        }

        if (!['supplier', 'customer'].includes(relationshipType)) {
            return res.status(400).json({ error: "relationshipType must be 'supplier' or 'customer'" });
        }

        // Check if counterparty already exists
        const [existing] = await db.select()
            .from(externalCounterparties)
            .where(and(
                eq(externalCounterparties.reportingOrgId, orgId),
                eq(externalCounterparties.externalName, externalName)
            ));

        if (existing) {
            // Update existing
            const updates: any = {
                transactionCount: (existing.transactionCount ?? 0) + 1,
                lastTransactionAt: new Date(),
                updatedAt: new Date()
            };

            if (isPositive === true) {
                updates.positiveCount = (existing.positiveCount ?? 0) + 1;
            } else if (isPositive === false) {
                updates.negativeCount = (existing.negativeCount ?? 0) + 1;
            }

            // Recalculate passive score
            const totalRatings = updates.positiveCount ?? existing.positiveCount ?? 0 + updates.negativeCount ?? existing.negativeCount ?? 0;
            if (totalRatings > 0) {
                const positiveRatio = (updates.positiveCount ?? existing.positiveCount ?? 0) / totalRatings;
                updates.passiveTrustScore = Math.round(positiveRatio * 1000);
            }

            const [updated] = await db.update(externalCounterparties)
                .set(updates)
                .where(eq(externalCounterparties.id, existing.id))
                .returning();

            return res.json(updated);
        }

        // Create new
        const [counterparty] = await db.insert(externalCounterparties).values({
            reportingOrgId: orgId,
            externalName,
            externalRfcHash,
            relationshipType,
            transactionCount: 1,
            positiveCount: isPositive === true ? 1 : 0,
            negativeCount: isPositive === false ? 1 : 0,
            passiveTrustScore: isPositive === true ? 1000 : (isPositive === false ? 0 : 500),
            lastTransactionAt: new Date()
        }).returning();

        res.json(counterparty);
    } catch (error) {
        console.error("Error creating/updating counterparty:", error);
        res.status(500).json({ error: "Failed to create/update counterparty" });
    }
});

export const marketplaceRoutes = router;
