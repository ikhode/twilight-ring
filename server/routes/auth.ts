import type { Express, Request, Response } from "express";
import { db } from "../storage";
import { users, organizations, userOrganizations, aiConfigurations, organizationModules } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { industryTemplates } from "../seed";
import { supabaseAdmin } from "../supabase";
import { MODULE_REGISTRY } from "../data/module-registry";

/**
 * Register authentication routes using Supabase
 */
export function registerAuthRoutes(app: Express) {

    // Signup - create user in Supabase Auth, then create organization and sync public user
    app.post("/api/auth/signup", async (req: Request, res: Response) => {
        try {
            const { email, password, name, organizationName, industry } = req.body;

            // Validate input
            if (!email || !password || !name || !organizationName || !industry) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            // 1. Create User in Supabase Auth
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm for now (or strictly require email verification flow)
                user_metadata: { name }
            });

            if (authError) {
                console.error("Supabase Auth Error:", authError);
                return res.status(400).json({ message: authError.message });
            }

            if (!authData.user) {
                return res.status(500).json({ message: "Failed to create user in Supabase" });
            }

            const userId = authData.user.id;

            // 2. Create Organization
            const [organization] = await db.insert(organizations).values({
                name: organizationName,
                industry,
                subscriptionTier: "starter",
                subscriptionStatus: "active",
                subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                subscriptionInterval: "monthly",
            }).returning();

            // 3. Create public User record (sync with Supabase ID)
            const [user] = await db.insert(users).values({
                id: userId,
                email,
                name,
            }).returning();

            // 4. Link user to organization as admin
            await db.insert(userOrganizations).values({
                userId: user.id,
                organizationId: organization.id,
                role: "admin",
            });

            // 5. Create AI configuration with defaults
            await db.insert(aiConfigurations).values({
                organizationId: organization.id,
                guardianEnabled: true,
                guardianSensitivity: 5,
                copilotEnabled: true,
                adaptiveUiEnabled: true,
            });

            // 6. Enable all modules by default (as per user request: "better to deactivate than to activate")
            const allModuleIds = MODULE_REGISTRY.map(m => m.id);
            for (const moduleId of allModuleIds) {
                await db.insert(organizationModules).values({
                    organizationId: organization.id,
                    moduleId,
                    enabled: true,
                });
            }

            res.status(201).json({
                message: "Account created successfully",
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
                organization: {
                    id: organization.id,
                    name: organization.name,
                    industry: organization.industry,
                },
            });
        } catch (error) {
            console.error("Signup error:", error);
            // If DB operations fail, we might want to delete the Supabase Auth user to maintain consistency
            res.status(500).json({ message: "Internal server error" });
        }
    });


    // Session Sync Endpoint - Frontend sends tokens, backend stores them in cookies
    // This is needed because Supabase auth happens on client-side only
    app.post("/api/auth/session", async (req: Request, res: Response) => {
        try {
            const { access_token, refresh_token } = req.body;

            if (!access_token || !refresh_token) {
                return res.status(400).json({ message: "Missing tokens" });
            }

            const { createSupabaseServerClient } = await import("../supabase");
            const supabase = createSupabaseServerClient(req, res);

            // Establish session from frontend tokens and store in cookies
            const { data, error } = await supabase.auth.setSession({
                access_token,
                refresh_token
            });

            if (error) {
                console.error("[Auth] Session sync error:", error);
                return res.status(401).json({ message: error.message });
            }

            res.json({
                message: "Session established",
                user: { id: data.user.id, email: data.user.email }
            });
        } catch (error) {
            console.error("[Auth] Session sync error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });


    // Get user profile by ID (or Email if trusted)
    // In a real scenario, this would extract the User ID from the JWT sent in headers
    app.get("/api/auth/profile/:uid", async (req: Request, res: Response) => {
        try {
            const userId = req.params.uid;

            let user = await db.query.users.findFirst({
                where: eq(users.id, userId),
            });

            if (!user) {
                // [Recovery Logic] Check Supabase Auth
                const { data: { user: sbUser }, error: sbError } = await supabaseAdmin.auth.admin.getUserById(userId);

                if (sbUser && !sbError && sbUser.email) {
                    console.log(`[Auth] Recovering missing profile for ${userId}`);

                    const email = sbUser.email;
                    const name = sbUser.user_metadata?.name || email.split("@")[0] || "User";
                    const industry = sbUser.user_metadata?.industry || "other";
                    const orgName = sbUser.user_metadata?.organizationName || `${name}'s Organization`;

                    // 1. Create User
                    const [newUser] = await db.insert(users).values({
                        id: userId,
                        email,
                        name,
                    }).returning();
                    user = newUser;

                    // 2. Create Organization (Default Recovery)
                    // Note: In a complex app, we might check if they were invited to an existing org, 
                    // but here we restore them as a fresh Admin of their own org.
                    const [organization] = await db.insert(organizations).values({
                        name: orgName,
                        industry,
                        subscriptionTier: "starter",
                        subscriptionStatus: "active",
                        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                        subscriptionInterval: "monthly",
                    }).returning();

                    // 3. Link User to Org
                    await db.insert(userOrganizations).values({
                        userId: user.id,
                        organizationId: organization.id,
                        role: "admin",
                        xp: 0,
                        level: 1
                    });

                    // 4. AI Config
                    await db.insert(aiConfigurations).values({
                        organizationId: organization.id,
                        guardianEnabled: true,
                        guardianSensitivity: 5,
                        copilotEnabled: true,
                        adaptiveUiEnabled: true,
                    });

                    // 5. Enable all modules by default for recovery (as per user request)
                    const allModuleIds = MODULE_REGISTRY.map(m => m.id);
                    for (const moduleId of allModuleIds) {
                        try {
                            await db.insert(organizationModules).values({
                                organizationId: organization.id,
                                moduleId,
                                enabled: true,
                            });
                        } catch (e) {
                            console.warn(`[Auth] Failed to restore module ${moduleId}`, e);
                        }
                    }

                } else {
                    return res.status(404).json({ message: "User not found" });
                }
            }

            const userOrgs = await db.query.userOrganizations.findMany({
                where: eq(userOrganizations.userId, user.id),
                with: { organization: true },
            });

            // Default to the first one, but return all
            const activeOrg = userOrgs.length > 0 ? userOrgs[0] : null;

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
                organization: activeOrg?.organization, // Kept for backward compatibility
                role: activeOrg?.role, // Kept for backward compatibility
                organizations: userOrgs.map(uo => ({
                    ...uo.organization,
                    role: uo.role // Include role in the organization object
                }))
            });

        } catch (error) {
            res.status(500).json({ message: "Internal Server Error" });
        }
    });

    // Logout - Clear Supabase session and cookies
    app.post("/api/auth/logout", async (req: Request, res: Response) => {
        try {
            const { createSupabaseServerClient } = await import("../supabase");
            const supabase = createSupabaseServerClient(req, res);
            await supabase.auth.signOut();
            res.json({ message: "Logged out successfully" });
        } catch (error) {
            console.error("[Auth] Logout error:", error);
            res.json({ message: "Logged out successfully" }); // Still respond OK
        }
    });

    // Get Current User Org Data (XP, Level, Role)
    app.get("/api/user-org", async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) return res.status(401).json({ message: "No token provided" });
            const token = authHeader.replace("Bearer ", "");

            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) return res.status(401).json({ message: "Invalid token" });

            const userOrg = await db.query.userOrganizations.findFirst({
                where: eq(userOrganizations.userId, user.id),
                with: { organization: true },
            });

            if (!userOrg) return res.status(404).json({ message: "User not linked to organization" });

            res.json({
                ...userOrg,
                // Ensure defaults if fields are missing in DB schema (though schema should have them)
                xp: (userOrg as any).xp || 120, // Fallback if schema update is pending
                level: (userOrg as any).level || 1
            });
        } catch (error) {
            console.error("Get user-org error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
