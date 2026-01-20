
import { Router } from "express";
import { vectorStore } from "../services/vector-store";
import { db } from "../storage";
import { eq } from "drizzle-orm";
import { products, processSteps } from "@shared/schema";

const router = Router();

router.post("/semantic", async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        // 1. Vector Search (Get IDs and Confidence)
        const results = await vectorStore.search(query, 5);

        // 2. Fetch Entity Details (Simulated "GraphQL" Resolving)
        // In a full implementation, we'd use the GraphQL client here or let the frontend do it.
        // For now, we resolve basic details to show the concept.
        const resolvedResults = await Promise.all(results.map(async (r) => {
            let subtitle = "Entity";
            let details = {};

            // Resolve details based on entity type (this mimics what a GraphQL Resolver would do)
            if (r.entityType === "product") {
                const product = await db.query.products.findFirst({
                    where: eq(products.id, r.entityId)
                });
                if (product) {
                    subtitle = `Product - ${product.category}`;
                    details = { price: product.price, stock: product.stock };
                }
            } else if (r.entityType === "process_step") {
                // Mock fetch for process step if not easily queryable in this context
                subtitle = "Process Step";
            }

            return {
                ...r,
                title: r.content, // Semantic content usually acts as the title or summary
                subtitle,
                details
            };
        }));

        res.json({ results: resolvedResults });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export const searchRoutes = router;
