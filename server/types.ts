import { Request } from "express";
import { User as SystemUser } from "../shared/schema";
import { User as SupabaseUser } from "@supabase/supabase-js";

/**
 * Request personalizado que incluye los datos de autenticación inyectados por el middleware.
 * Elimina la necesidad de usar 'as any' en los controladores de ruta.
 */
export interface AuthenticatedRequest extends Request {
    user: SystemUser;
    organizationId?: string;
    role?: string;
    supabaseUser?: SupabaseUser;
}

/**
 * Request específico para operaciones desde terminales/kioskos.
 */
export interface KioskRequest extends AuthenticatedRequest {
    terminalId: string;
    employeeId: string;
    deviceId: string;
}
