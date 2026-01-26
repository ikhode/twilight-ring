
import { Organization } from "@shared/core/schema";

export type UserProfile = {
    user: {
        id: string;
        email: string;
        name: string;
    };
    role?: string;
    organizationId?: string;
    organization: Organization;
    organizations: Organization[];
};
