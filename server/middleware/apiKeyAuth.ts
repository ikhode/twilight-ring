import { Request, Response, NextFunction } from "express";
import { db } from "../storage";
import { apiKeys } from "../../shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";
import { AuthenticatedRequest } from "../types";

/**
 * Middleware to authorize requests using API Keys.
 * Checks for X-API-Key header and validates against key_hash.
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
        return next(); // Proceed to check standard auth
    }

    try {
        const [prefix, key] = apiKey.split(".");
        if (!prefix || !key) {
            return res.status(401).json({ message: "Formato de clave API inválido" });
        }

        const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

        const keyRecord = await db.query.apiKeys.findFirst({
            where: and(
                eq(apiKeys.keyHash, keyHash),
                isNull(apiKeys.revokedAt)
            ),
            with: {
                organization: true
            }
        });

        if (!keyRecord) {
            return res.status(401).json({ message: "Clave API inválida o revocada" });
        }

        if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
            return res.status(401).json({ message: "Clave API expirada" });
        }

        // Mock a user object for consistency with downstream guards
        (req as any).user = {
            id: `api_key_${keyRecord.id}`,
            email: `api_${keyRecord.keyPrefix}@nexus.internal`,
            role: keyRecord.role,
        };
        (req as any).organizationId = keyRecord.organizationId;
        (req as any).isApiKey = true;

        // Update last used
        await db.update(apiKeys)
            .set({ lastUsedAt: new Date() })
            .where(eq(apiKeys.id, keyRecord.id));

        next();
    } catch (error) {
        console.error("[APIKeyAuth] Error:", error);
        res.status(500).json({ message: "Error interno en autenticación de API" });
    }
}
