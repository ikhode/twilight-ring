import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useLocation } from "wouter";
import { Organization } from "@shared/core/schema";

// Custom type ensuring we handle the Profile response structure
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

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null; // Extended profile from our DB
    organization: Organization | null; // Active Organization
    allOrganizations: Organization[]; // List of all linked organizations
    switchOrganization: (orgId: string) => void;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    organization: null,
    allOrganizations: [],
    switchOrganization: () => { },
    loading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
    const [, setLocation] = useLocation();

    useEffect(() => {
        // Attempt to hydrate from cache immediately to show UI faster
        const cached = localStorage.getItem("nexus_profile");
        if (cached) {
            try {
                const parsed = JSON.parse(cached) as UserProfile;
                // We assume valid structure if parsed
                if (parsed.organization) {
                    // Optimistic hydration
                }
            } catch (e) {
                // Invalid cache
            }
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // Optimize: Load from cache if valid for this user
                const cached = localStorage.getItem("nexus_profile");
                let hydrated = false;
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached) as UserProfile;
                        // Simple validation: check if the cached profile matches current user
                        if (parsed.user && parsed.user.id === session.user.id) {
                            console.log("⚡ Hydrating profile from cache");
                            setProfile(parsed);
                            processOrgData(parsed);
                            setLoading(false); // Enable app immediately
                            hydrated = true;
                        }
                    } catch (e) { console.error("Cache parse error", e); }
                }

                // Always fetch fresh data (stale-while-revalidate), unless hydrated implies we stop? 
                // No, we should always sync.
                void fetchProfile(session.user.id, !hydrated);
            } else {
                setLoading(false);
            }
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // We don't re-hydrate here to avoid flickering, just fetch.
                void fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setOrganization(null);
                setAllOrganizations([]);
                setLoading(false);
                // Clear cache on logout to be safe
                localStorage.removeItem("nexus_profile");
                localStorage.removeItem("nexus_onboarding_completed");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const processOrgData = (data: UserProfile) => {
        // Handle Multi-Org
        const orgs = data.organizations || (data.organization ? [data.organization] : []);
        setAllOrganizations(orgs);

        // Restore persistent selection or default to first
        const savedOrgId = localStorage.getItem("nexus_active_org");
        const savedOrg = orgs.find((o) => o.id === savedOrgId);
        let active = savedOrg || orgs[0] || null;

        // Self-Healing
        if (active && active.name?.trim().startsWith("{") && active.name?.includes("name")) {
            try {
                const parsed = JSON.parse(active.name) as { name: string };
                if (parsed.name) active = { ...active, name: parsed.name };
            } catch (e) {
                // Ignore
            }
        }

        setOrganization(active);
        if (active) {
            localStorage.setItem("nexus_active_org", active.id);

            // Set Onboarding Flag
            if (active.industry && active.industry !== 'other' && active.onboardingStatus === 'completed') {
                localStorage.setItem("nexus_onboarding_completed", "true");
            }
        }
    };

    const fetchProfile = async (uid: string, shouldSetLoading = true) => {
        try {
            // Only set loading if we haven't hydrated
            // if (shouldSetLoading) setLoading(true); 
            // Actually, we don't want to flip loading back to true if we already hydrated.

            const res = await fetch(`/api/auth/profile/${uid}`);
            if (res.ok) {
                const data = await res.json() as UserProfile;

                // Save to Cache
                localStorage.setItem("nexus_profile", JSON.stringify(data));

                setProfile(data);
                processOrgData(data);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const switchOrganization = async (orgId: string) => {
        const target = allOrganizations.find(o => o.id === orgId);
        if (target) {
            setOrganization(target);
            localStorage.setItem("nexus_active_org", target.id);
            // Reload page to ensure all contexts (Tanstack Query, etc.) refresh with new headers
            // A hard reload is safest for this architectural change
            window.location.reload();
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("nexus_active_org");
        setLocation("/login");
    };

    return (
        <AuthContext.Provider value={{
            session,
            user,
            profile,
            organization,
            allOrganizations,
            switchOrganization,
            loading,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
