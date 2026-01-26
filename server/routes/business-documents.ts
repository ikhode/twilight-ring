import { Express, Request, Response } from "express";
import { db } from "../storage";
import { businessDocuments } from "@shared/schema";
import { getOrgIdFromRequest } from "../auth_util";
import { eq, desc, and } from "drizzle-orm";

export function registerBusinessDocumentRoutes(app: Express) {

    // POST /api/business-documents/upload (Simulates Upload + OCR)
    app.post("/api/business-documents/upload", async (req: Request, res: Response) => {
        try {
            const orgId = await getOrgIdFromRequest(req);
            if (!orgId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const { name, fileUrl, entityId, entityType } = req.body;

            // 1. Initial Insert (Status: Processing)
            const [doc] = await db.insert(businessDocuments).values({
                organizationId: orgId,
                name: name || "Untitled Document",
                type: "detecting",
                status: "processing",
                fileUrl: fileUrl,
                uploadedBy: req.body.userId,
                relatedEntityId: entityId || null,
                relatedEntityType: entityType || null
            }).returning();

            // 2. Simulate Async AI Analysis (Deterministic Mock)
            setTimeout(async () => {
                let detectedType = "other";
                let extracted = {};
                let confidence = 0;

                const lowerName = name.toLowerCase();

                if (lowerName.includes("factura") || lowerName.includes("invoice")) {
                    detectedType = "invoice";
                    confidence = 95;
                    extracted = {
                        amount: Math.floor(Math.random() * 10000) + 500,
                        currency: "MXN",
                        supplier: lowerName.includes("office") ? "Office Depot" : "Proveedora General",
                        invoiceId: "INV-" + Math.floor(Math.random() * 1000),
                        date: new Date().toISOString().split('T')[0]
                    };
                } else if (lowerName.includes("contrato") || lowerName.includes("contract")) {
                    detectedType = "contract";
                    confidence = 88;
                    extracted = {
                        party: "Empleado Nuevo",
                        duration: "Indefinido",
                        startDate: new Date().toISOString().split('T')[0]
                    };
                } else if (lowerName.includes("constancia") || lowerName.includes("csf") || lowerName.includes("situacion")) {
                    detectedType = "tax_id"; // Cédula Fiscal
                    confidence = 98;
                    extracted = {
                        rfc: "XAXX010101000",
                        razonSocial: "EMPRESA EJEMPLO S.A. DE C.V.",
                        regimen: "601 - General de Ley Personas Morales",
                        cp: "06600",
                        fecha: new Date().toISOString().split('T')[0]
                    };
                } else if (lowerName.includes("ine") || lowerName.includes("identificacion")) {
                    detectedType = "identification";
                    confidence = 92;
                    extracted = {
                        nombre: "JUAN PEREZ",
                        curp: "PEPJ900101HDFRRA01",
                        edad: 34,
                        domicilio: "AV. REFORMA 100"
                    };
                } else {
                    detectedType = "receipt";
                    confidence = 60;
                    extracted = { merchant: "Unknown" };
                }

                await db.update(businessDocuments)
                    .set({
                        type: detectedType,
                        status: "analyzed", // Ready for review
                        extractedData: extracted,
                        confidence: confidence
                    })
                    .where(eq(businessDocuments.id, doc.id));

            }, 5000); // 5 second "Processing" animation time

            res.status(201).json(doc);

        } catch (error) {
            console.error("Upload error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // GET /api/business-documents
    // Supports ?entityId=UUID&entityType=string for filtering
    app.get("/api/business-documents", async (req: Request, res: Response) => {
        try {
            const orgId = await getOrgIdFromRequest(req);
            if (!orgId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const { entityId, entityType } = req.query;

            let conditions: any = eq(businessDocuments.organizationId, orgId);

            if (entityId && typeof entityId === 'string') {
                conditions = and(conditions, eq(businessDocuments.relatedEntityId, entityId));
            }
            if (entityType && typeof entityType === 'string') {
                conditions = and(conditions, eq(businessDocuments.relatedEntityType, entityType));
            }

            const docs = await db.query.businessDocuments.findMany({
                where: conditions,
                orderBy: [desc(businessDocuments.createdAt)]
            });

            res.json(docs);
        } catch (error) {
            console.error("List documents error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // PATCH /api/business-documents/:id (Verify/Action)
    app.patch("/api/business-documents/:id", async (req: Request, res: Response) => {
        try {
            const orgId = await getOrgIdFromRequest(req);
            if (!orgId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const { status, type, extractedData } = req.body;

            const [updated] = await db.update(businessDocuments)
                .set({
                    status,
                    type,
                    extractedData,
                    updatedAt: new Date()
                })
                .where(and(
                    eq(businessDocuments.id, req.params.id),
                    eq(businessDocuments.organizationId, orgId)
                ))
                .returning();

            res.json(updated);
        } catch (error) {
            res.status(500).json({ message: "Update error" });
        }
    });
}
