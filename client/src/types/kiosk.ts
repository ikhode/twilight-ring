import { Terminal } from "@shared/schema";

export interface KioskSession {
    terminal: Terminal;
    driver?: {
        id: string;
        name: string;
        role?: string | null;
        status?: string | null;
        currentStatus?: string | null;
    };
}
