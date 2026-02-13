import { Router } from "express";
import { getOrgIdFromRequest } from "../auth_util";
import { db } from "../storage";
import { eq, and, desc, sql, ne, or } from "drizzle-orm";
import {
    marketplaceListings,
    marketplaceOffers,
    trustTransactions,
    trustProfiles
} from "@shared/schema";
import { organizations } from "@shared/schema";

const router = Router();

// ==========================================
// B2B Marketplace: Product Listings
// ==========================================

// Get all active listings (Marketplace Feed)
router.get("/feed", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        // Get active listings from other organizations
        const listings = await db.select({
            id: marketplaceListings.id,
            productName: marketplaceListings.productName,
            description: marketplaceListings.description,
            category: marketplaceListings.category,
            price: marketplaceListings.price,
            currency: marketplaceListings.currency,
            stock: marketplaceListings.quantityAvailable,
            minOrderQty: marketplaceListings.minOrderQty,
            sellerName: organizations.name,
            sellerTrustScore: marketplaceListings.sellerTrustScore,
            createdAt: marketplaceListings.createdAt,
        })
            .from(marketplaceListings)
            .innerJoin(organizations, eq(organizations.id, marketplaceListings.sellerId))
            .where(and(
                ne(marketplaceListings.sellerId, orgId),
                eq(marketplaceListings.isActive, true)
            ))
            .orderBy(desc(marketplaceListings.createdAt))
            .limit(50);

        res.json(listings);
    } catch (error) {
        console.error("Error fetching marketplace feed:", error);
        res.status(500).json({ error: "Failed to fetch marketplace feed" });
    }
});

// Get my listings
router.get("/my-listings", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const listings = await db.select()
            .from(marketplaceListings)
            .where(eq(marketplaceListings.sellerId, orgId))
            .orderBy(desc(marketplaceListings.createdAt));

        res.json(listings);
    } catch (error) {
        console.error("Error fetching my listings:", error);
        res.status(500).json({ error: "Failed to fetch listings" });
    }
});

// Create new listing
router.post("/listings", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const [profile] = await db.select()
            .from(trustProfiles)
            .where(eq(trustProfiles.organizationId, orgId));

        const listing = await db.insert(marketplaceListings).values({
            sellerId: orgId,
            ...req.body,
            sellerTrustScore: profile?.trustScore ?? 0,
            isActive: true
        }).returning();

        res.json(listing[0]);
    } catch (error) {
        console.error("Error creating listing:", error);
        res.status(500).json({ error: "Failed to create listing" });
    }
});

// ==========================================
// RFQ & Offers (Negotiation Flow)
// ==========================================

// Submit an offer (RFQ)
router.post("/offers", async (req, res) => {
    try {
        const buyerId = await getOrgIdFromRequest(req);
        if (!buyerId) return res.status(401).json({ error: "Unauthorized" });

        const { listingId, qtyRequested, pricePerUnit, terms } = req.body;

        const [listing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, listingId));
        if (!listing) return res.status(404).json({ error: "Listing not found" });

        const offer = await db.insert(marketplaceOffers).values({
            listingId,
            buyerId,
            sellerId: listing.sellerId,
            qtyRequested,
            pricePerUnit,
            totalPrice: qtyRequested * pricePerUnit,
            terms,
            status: 'pending'
        }).returning();

        res.json(offer[0]);
    } catch (error) {
        console.error("Error submitting offer:", error);
        res.status(500).json({ error: "Failed to submit offer" });
    }
});

// Get my offers (as buyer or seller)
router.get("/offers", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const offers = await db.select()
            .from(marketplaceOffers)
            .where(or(
                eq(marketplaceOffers.buyerId, orgId),
                eq(marketplaceOffers.sellerId, orgId)
            ))
            .orderBy(desc(marketplaceOffers.createdAt));

        res.json(offers);
    } catch (error) {
        console.error("Error fetching offers:", error);
        res.status(500).json({ error: "Failed to fetch offers" });
    }
});

// Accept/Reject offer
router.patch("/offers/:id/status", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'rejected'

        const [offer] = await db.select().from(marketplaceOffers).where(eq(marketplaceOffers.id, id));
        if (!offer) return res.status(404).json({ error: "Offer not found" });

        // Only seller can accept/reject
        if (offer.sellerId !== orgId) return res.status(403).json({ error: "Forbidden" });

        await db.update(marketplaceOffers)
            .set({ status, updatedAt: new Date() })
            .where(eq(marketplaceOffers.id, id));

        // If accepted, initiate transaction
        if (status === 'accepted') {
            await db.insert(trustTransactions).values({
                offerId: id,
                buyerId: offer.buyerId,
                sellerId: offer.sellerId,
                amount: offer.totalPrice,
                status: 'initiated'
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Error updating offer status:", error);
        res.status(500).json({ error: "Failed to update offer" });
    }
});

// ==========================================
// Transactions
// ==========================================

// Get my transactions
router.get("/transactions", async (req, res) => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) return res.status(401).json({ error: "Unauthorized" });

        const transactions = await db.select()
            .from(trustTransactions)
            .where(or(
                eq(trustTransactions.buyerId, orgId),
                eq(trustTransactions.sellerId, orgId)
            ))
            .orderBy(desc(trustTransactions.createdAt));

        res.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});

export const marketplaceRoutes = router;
