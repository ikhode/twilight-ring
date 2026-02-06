import { Router } from "express";
import { db } from "../storage";
import {
    purchases, products, inventoryMovements, suppliers, expenses, cashRegisters, bankAccounts,
    insertPurchaseSchema, insertSupplierSchema, userOrganizations
} from "../../shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getOrgIdFromRequest, getAuthenticatedUser } from "../auth_util";
import { logAudit } from "../lib/audit";

const router = Router();

/**
 * Lists all purchases for the organization.
 */
router.get("/", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const data = await db.query.purchases.findMany({
            where: eq(purchases.organizationId, orgId),
            orderBy: [desc(purchases.date)],
            with: {
                supplier: true,
                product: true,
                driver: true,
                vehicle: true
            }
        });
        res.json(data);
    } catch (error) {
        console.error("Purchases list error:", error);
        res.status(500).json({ message: "Error fetching purchases" });
    }
});

/**
 * Creates a new purchase order.
 * Expects: { supplierId, items: [{ productId, quantity, cost }], logisticsMethod, driverId, vehicleId, freightCost, paymentMethod, bankAccountId }
 */
router.post("/", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { supplierId, items, logisticsMethod, driverId, vehicleId, freightCost, paymentMethod, bankAccountId, status, batchId: incomingBatchId } = req.body;
        const batchId = incomingBatchId || `PO-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        if (!items || !Array.isArray(items)) {
            res.status(400).json({ message: "Items array required" });
            return;
        }

        // Pre-Validation: Check Funds
        const totalRequired = items.reduce((sum: number, item: any) => sum + (Number(item.cost) * Number(item.quantity)), 0);

        if (status === 'paid') {
            if (paymentMethod === 'cash') {
                const register = await db.query.cashRegisters.findFirst({
                    where: and(eq(cashRegisters.organizationId, orgId), eq(cashRegisters.status, 'open'))
                });
                if (!register) {
                    res.status(400).json({ message: "No hay una caja abierta para procesar el pago en efectivo." });
                    return;
                }
                if (register.balance < totalRequired) {
                    res.status(400).json({
                        message: "Fondos insuficientes en caja",
                        required: totalRequired,
                        available: register.balance
                    });
                    return;
                }
            } else if (paymentMethod === 'transfer') {
                if (!bankAccountId) {
                    res.status(400).json({ message: "Debe seleccionar una cuenta bancaria para transferencias." });
                    return;
                }
                const bankAccount = await db.query.bankAccounts.findFirst({
                    where: and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.organizationId, orgId))
                });
                if (!bankAccount) {
                    res.status(400).json({ message: "Cuenta bancaria no encontrada." });
                    return;
                }
                if (bankAccount.balance < totalRequired) {
                    res.status(400).json({
                        message: "Fondos insuficientes en cuenta bancaria",
                        required: totalRequired,
                        available: bankAccount.balance
                    });
                    return;
                }
            }
        }

        // Get user for approval check
        const user = await getAuthenticatedUser(req);
        const membership = await db.query.userOrganizations.findFirst({
            where: and(eq(userOrganizations.userId, user!.id), eq(userOrganizations.organizationId, orgId))
        });
        const isAdmin = membership?.role === 'admin';

        const stats = { success: 0, errors: 0 };
        const createdIds = [];

        for (const item of items) {
            try {
                // Verify product belongs to org
                const [productStr] = await db.select().from(products).where(and(eq(products.id, item.productId), eq(products.organizationId, orgId)));
                if (!productStr) {
                    console.error(`Product ${item.productId} not found or unauthorized`);
                    stats.errors++;
                    continue;
                }

                const totalAmount = item.cost * item.quantity;

                // Validate Price Thresholds for non-admins
                if (!isAdmin) {
                    const unitPrice = Number(item.cost);
                    if (productStr.minPurchasePrice && unitPrice < productStr.minPurchasePrice) {
                        res.status(400).json({
                            message: `El precio de compra para ${productStr.name} es menor al mínimo permitido ($${(productStr.minPurchasePrice / 100).toFixed(2)})`
                        });
                        return;
                    }
                    if (productStr.maxPurchasePrice && unitPrice > productStr.maxPurchasePrice) {
                        res.status(400).json({
                            message: `El precio de compra para ${productStr.name} excede el máximo permitido ($${(productStr.maxPurchasePrice / 100).toFixed(2)})`
                        });
                        return;
                    }
                }
                const requiresApproval = !isAdmin && totalAmount > 500000; // > $5,000 MXN

                // Price Range Validation
                if (productStr.minPurchasePrice !== null && item.cost < productStr.minPurchasePrice) {
                    res.status(400).json({
                        message: `El precio unitario (${item.cost / 100}) es menor al mínimo permitido para ${productStr.name} (${productStr.minPurchasePrice / 100})`
                    });
                    return;
                }
                if (productStr.maxPurchasePrice !== null && item.cost > productStr.maxPurchasePrice) {
                    res.status(400).json({
                        message: `El precio unitario (${item.cost / 100}) excede el máximo permitido para ${productStr.name} (${productStr.maxPurchasePrice / 100})`
                    });
                    return;
                }

                const [record] = await db.insert(purchases).values({
                    organizationId: orgId,
                    supplierId,
                    productId: item.productId,
                    quantity: item.quantity,
                    totalAmount,
                    batchId,
                    paymentStatus: status === "paid" ? "paid" : "pending",
                    paymentMethod: paymentMethod || null,
                    bankAccountId: (status === "paid" && paymentMethod === "transfer") ? bankAccountId : null,
                    deliveryStatus: status === "received" ? "received" : "pending",
                    logisticsMethod: logisticsMethod || "delivery",
                    driverId: driverId || null,
                    vehicleId: vehicleId || null,
                    freightCost: freightCost || 0,
                    isApproved: !requiresApproval,
                    approvedBy: !requiresApproval ? user!.id : null,
                    date: new Date(),
                    paidAt: status === "paid" ? new Date() : null,
                    receivedAt: status === "received" ? new Date() : null,
                    notes: item.notes || null
                }).returning();

                createdIds.push(record.id);
                stats.success++;

                // If created as 'received' and approved, process stock
                if (status === "received" && record.isApproved) {
                    await receivePurchaseStock(orgId, record);
                }

                // If created as 'paid' and approved, record expense and deduct funds
                if (status === "paid" && record.isApproved) {
                    await recordPurchasePayment(orgId, record);
                }

            } catch (err) {
                console.error("Error creating purchase item:", err);
                stats.errors++;
            }
        }

        res.json({ message: "Purchase order created", stats, batchId, ids: createdIds });

    } catch (error) {
        console.error("Create purchase error:", error);
        res.status(500).json({ message: "Error creating purchase" });
    }
});

/**
 * Marks a purchase item as received (Update Stock).
 */
async function receivePurchaseStock(orgId: string, purchase: any) {
    // 1. Update Inventory (Stock + Weighted Average Cost)
    const [product] = await db.select().from(products).where(eq(products.id, purchase.productId));
    if (product) {
        const newStock = (product.stock || 0) + purchase.quantity;

        // Calculate new Weighted Average Cost
        const currentTotalValue = (product.cost || 0) * (product.stock || 0);
        const purchaseTotalValue = purchase.totalAmount;
        const newCost = newStock > 0 ? Math.round((currentTotalValue + purchaseTotalValue) / newStock) : product.cost;

        await db.update(products)
            .set({ stock: newStock, cost: newCost })
            .where(eq(products.id, purchase.productId));

        // Log Movement
        await db.insert(inventoryMovements).values({
            organizationId: orgId,
            productId: purchase.productId,
            type: "purchase",
            quantity: purchase.quantity,
            referenceId: purchase.id,
            beforeStock: product.stock || 0,
            afterStock: newStock,
            date: new Date(),
            notes: `Recepción Compra #${purchase.id.slice(0, 8)}`
        });
    }

    // 2. Update Purchase Status
    await db.update(purchases)
        .set({ deliveryStatus: "received", receivedAt: new Date() })
        .where(eq(purchases.id, purchase.id));

    // --- Emit to Cognitive Engine for Stock Monitoring ---
    const { CognitiveEngine } = await import("../lib/cognitive-engine");
    CognitiveEngine.emit({
        orgId,
        type: "employee_action",
        data: {
            action: "purchase_received",
            productId: purchase.productId,
            quantity: purchase.quantity,
            notes: `Stock incrementado para producto ${product?.name || 'Insumo'}`
        }
    });
}

/**
 * Registers payment for a purchase (Finance).
 * DEDUCTS FUNDS from Cash Register or Bank Account.
 */
async function recordPurchasePayment(orgId: string, purchase: any) {
    // 1. Find the product name for description
    const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, purchase.productId)).limit(1);

    // 2. Deduct Funds (Critical Step)
    if (purchase.paymentMethod === 'cash') {
        const register = await db.query.cashRegisters.findFirst({
            where: and(eq(cashRegisters.organizationId, orgId), eq(cashRegisters.status, 'open'))
        });
        // Assume validation happened before calling this function, but double check
        if (register) {
            await db.update(cashRegisters)
                .set({ balance: register.balance - purchase.totalAmount })
                .where(eq(cashRegisters.id, register.id));
        }
    } else if (purchase.paymentMethod === 'transfer' && purchase.bankAccountId) {
        const bankAccount = await db.query.bankAccounts.findFirst({
            where: and(eq(bankAccounts.id, purchase.bankAccountId), eq(bankAccounts.organizationId, orgId))
        });
        if (bankAccount) {
            await db.update(bankAccounts)
                .set({ balance: bankAccount.balance - purchase.totalAmount })
                .where(eq(bankAccounts.id, bankAccount.id));
        }
    }

    // 3. Record Financial Expense
    await db.insert(expenses).values({
        organizationId: orgId,
        amount: purchase.totalAmount,
        description: `Pago Compra: ${product?.name || 'Insumo'} (${purchase.quantity} u.)`,
        date: new Date(),
        category: "Abastecimiento",
        supplierId: purchase.supplierId
    });

    // 4. Update Purchase Status
    await db.update(purchases)
        .set({ paymentStatus: "paid", paidAt: new Date() })
        .where(eq(purchases.id, purchase.id));
}

router.patch("/:id/pay", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const { paymentMethod, bankAccountId } = req.body;

        const [purchase] = await db.query.purchases.findMany({
            where: and(eq(purchases.id, id), eq(purchases.organizationId, orgId)),
        });

        if (!purchase) {
            res.status(404).json({ message: "Purchase not found" });
            return;
        }
        if (purchase.paymentStatus === "paid") {
            res.status(400).json({ message: "Already paid" });
            return;
        }

        const effectiveMethod = paymentMethod || purchase.paymentMethod;

        // Validate Funds based on Method
        if (effectiveMethod === 'cash') {
            const register = await db.query.cashRegisters.findFirst({
                where: and(eq(cashRegisters.organizationId, orgId), eq(cashRegisters.status, 'open'))
            });
            if (!register) {
                res.status(400).json({ message: "No hay una caja abierta para procesar el pago." });
                return;
            }
            if (register.balance < purchase.totalAmount) {
                res.status(400).json({
                    message: "Fondos insuficientes en caja",
                    required: purchase.totalAmount,
                    available: register.balance
                });
                return;
            }
        } else if (effectiveMethod === 'transfer') {
            if (!bankAccountId && !purchase.bankAccountId) {
                res.status(400).json({ message: "Debe proporcionar una cuenta bancaria." });
                return;
            }
            const accountId = bankAccountId || purchase.bankAccountId;
            const bankAccount = await db.query.bankAccounts.findFirst({
                where: and(eq(bankAccounts.id, accountId), eq(bankAccounts.organizationId, orgId))
            });
            if (!bankAccount) {
                res.status(400).json({ message: "Cuenta bancaria inválida o no encontrada." });
                return;
            }
            if (bankAccount.balance < purchase.totalAmount) {
                res.status(400).json({
                    message: "Fondos insuficientes en la cuenta bancaria.",
                    required: purchase.totalAmount,
                    available: bankAccount.balance
                });
                return;
            }
        }

        // Update purchase details before recording payment
        await db.update(purchases).set({
            paymentMethod: effectiveMethod,
            bankAccountId: bankAccountId || purchase.bankAccountId
        }).where(eq(purchases.id, id));

        // Refresh purchase object with new values before passing to recorder
        purchase.paymentMethod = effectiveMethod;
        purchase.bankAccountId = bankAccountId || purchase.bankAccountId;

        await recordPurchasePayment(orgId, purchase);
        res.json({ message: "Payment registered and funds deducted successfully." });
    } catch (error) {
        console.error("Pay purchase error:", error);
        res.status(500).json({ message: "Error processing payment" });
    }
});

/**
 * Registers payment for all items in a batch.
 */
router.patch("/batch/:batchId/pay", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { batchId } = req.params;
        const { paymentMethod, bankAccountId } = req.body;

        const pendingItems = await db.query.purchases.findMany({
            where: and(
                eq(purchases.batchId, batchId),
                eq(purchases.organizationId, orgId),
                eq(purchases.paymentStatus, "pending"),
                eq(purchases.isApproved, true)
            )
        });

        if (pendingItems.length === 0) {
            res.status(400).json({ message: "No pending or approved items found in this batch" });
            return;
        }

        const totalAmount = pendingItems.reduce((sum, item) => sum + item.totalAmount, 0);

        // Validate Funds globally for the batch
        if (paymentMethod === 'cash') {
            const register = await db.query.cashRegisters.findFirst({
                where: and(eq(cashRegisters.organizationId, orgId), eq(cashRegisters.status, 'open'))
            });
            if (!register) {
                res.status(400).json({ message: "No hay una caja abierta para procesar el pago." });
                return;
            }
            if (register.balance < totalAmount) {
                res.status(400).json({
                    message: "Fondos insuficientes en caja",
                    required: totalAmount,
                    available: register.balance
                });
                return;
            }
        } else if (paymentMethod === 'transfer') {
            if (!bankAccountId) {
                res.status(400).json({ message: "Debe seleccionar una cuenta bancaria." });
                return;
            }
            const bankAccount = await db.query.bankAccounts.findFirst({
                where: and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.organizationId, orgId))
            });
            if (!bankAccount) {
                res.status(400).json({ message: "Cuenta bancaria no encontrada." });
                return;
            }
            if (bankAccount.balance < totalAmount) {
                res.status(400).json({
                    message: "Fondos insuficientes en cuenta bancaria",
                    required: totalAmount,
                    available: bankAccount.balance
                });
                return;
            }
        }

        // Process payments
        for (const item of pendingItems) {
            await db.update(purchases).set({
                paymentMethod,
                bankAccountId: bankAccountId || null
            }).where(eq(purchases.id, item.id));

            item.paymentMethod = paymentMethod;
            item.bankAccountId = bankAccountId;

            await recordPurchasePayment(orgId, item);
        }

        res.json({ message: `${pendingItems.length} items paid successfully` });
    } catch (error) {
        console.error("Batch pay error:", error);
        res.status(500).json({ message: "Error processing batch payment" });
    }
});

/**
 * Cancels all items in a batch.
 */
router.patch("/batch/:batchId/cancel", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { batchId } = req.params;

        const items = await db.query.purchases.findMany({
            where: and(
                eq(purchases.batchId, batchId),
                eq(purchases.organizationId, orgId),
                eq(purchases.deliveryStatus, "pending")
            )
        });

        if (items.length === 0) {
            res.status(400).json({ message: "No compatible items found to cancel" });
            return;
        }

        await db.update(purchases)
            .set({ deliveryStatus: "cancelled" })
            .where(and(eq(purchases.batchId, batchId), eq(purchases.organizationId, orgId)));

        res.json({ message: "Order cancelled successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error cancelling batch" });
    }
});

/**
 * Marks a purchase order as archived (Secure Deletion).
 * Admin can delete permanently, others can only archive.
 */
router.delete("/batch/:batchId", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        const user = await getAuthenticatedUser(req);
        if (!orgId || !user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { batchId } = req.params;
        const { permanent } = req.query;

        const membership = await db.query.userOrganizations.findFirst({
            where: and(eq(userOrganizations.userId, user.id), eq(userOrganizations.organizationId, orgId))
        });

        const isAdmin = membership?.role === 'admin';

        if (permanent === 'true') {
            if (!isAdmin) {
                res.status(403).json({ message: "Only administrators can permanently delete records" });
                return;
            }
            await db.delete(purchases).where(and(eq(purchases.batchId, batchId), eq(purchases.organizationId, orgId)));
            res.json({ message: "Batch permanently deleted" });
            return;
        }

        // Default: Soft Delete (Archive)
        await db.update(purchases)
            .set({
                isArchived: true,
                deletedAt: new Date(),
                deletedBy: user.id
            })
            .where(and(eq(purchases.batchId, batchId), eq(purchases.organizationId, orgId)));

        res.json({ message: "Batch archived successfully" });
    } catch (error) {
        console.error("Delete purchase error:", error);
        res.status(500).json({ message: "Error deleting purchase order" });
    }
});

/**
 * Updates logistics for all items in a batch.
 */
router.patch("/batch/:batchId/logistics", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { batchId } = req.params;
        const { driverId, vehicleId, freightCost, logisticsMethod } = req.body;

        const updateData: any = {};
        if (driverId !== undefined) updateData.driverId = driverId;
        if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
        if (freightCost !== undefined) updateData.freightCost = freightCost;
        if (logisticsMethod !== undefined) updateData.logisticsMethod = logisticsMethod;

        await db.update(purchases)
            .set(updateData)
            .where(and(eq(purchases.batchId, batchId), eq(purchases.organizationId, orgId)));

        res.json({ message: "Batch logistics updated" });
    } catch (error) {
        res.status(500).json({ message: "Error updating batch logistics" });
    }
});

// End of Router



/**
 * --- NEW FEATURES ---
 */

// Supplier Management
router.get("/suppliers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const allSuppliers = await db.query.suppliers.findMany({
            where: eq(suppliers.organizationId, orgId)
        });
        res.json(allSuppliers);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch suppliers" });
    }
});

router.post("/suppliers", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const parsed = insertSupplierSchema.safeParse({ ...req.body, organizationId: orgId });
        if (!parsed.success) {
            res.status(400).json(parsed.error);
            return;
        }

        const [supplier] = await db.insert(suppliers).values(parsed.data).returning();
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ message: "Failed to create supplier" });
    }
});

router.put("/suppliers/:id", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { id } = req.params;

        const [updated] = await db.update(suppliers)
            .set(req.body)
            .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, orgId)))
            .returning();

        if (!updated) {
            res.status(404).json({ message: "Supplier not found" });
            return;
        }
        res.json(updated);

    } catch (error) {
        res.status(500).json({ message: "Failed to update supplier" });
    }
});

// Cost Analysis (Simple Average Cost History)
router.get("/history/cost-analysis", async (req, res): Promise<void> => {
    try {
        const orgId = await getOrgIdFromRequest(req);
        if (!orgId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Get purchases grouped by product to see cost evolution
        // For MVP, we just return the purchase history as raw data for the frontend to chart
        const history = await db.query.purchases.findMany({
            where: and(
                eq(purchases.organizationId, orgId),
                eq(purchases.deliveryStatus, "received")
            ),
            with: { product: true },
            orderBy: [desc(purchases.date)],
            limit: 50
        });

        const analysis = history.map(p => ({
            date: p.date,
            product: p.product?.name,
            quantity: p.quantity,
            totalCost: p.totalAmount,
            unitCost: p.quantity > 0 ? Math.round(p.totalAmount / p.quantity) : 0
        }));

        res.json(analysis);
    } catch (error) {
        res.status(500).json({ message: "Failed to generate cost analysis" });
    }
});

export default router;
