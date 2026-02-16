
import { Organization } from "@shared/core/schema";

export interface UserProfile {
    user: {
        id: string;
        email: string;
        name: string;
    };
    organization: Organization;
    role: "admin" | "manager" | "user" | "cashier";
    organizations: (Organization & {
        role: "admin" | "manager" | "user" | "cashier";
        permissions: string[];
    })[];
}
