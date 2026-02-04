import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useLocation } from "wouter";
import { Organization } from "@shared/core/schema";
import { UserProfile } from "@/types/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

/**
 * Global authentication context for managing session, user, and active organization.
 */
const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    organization: null,
    allOrganizations: [],
    switchOrganization: () => { /* noop */ },
    loading: true,
    signOut: async () => { /* noop */ },
});

/**
 * Provider component that handles initial session load and auth state synchronization.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();

    const { data: profileData, isLoading: isProfileLoading, error: profileError } = useQuery<UserProfile>({
        queryKey: ["/api/auth/profile", user?.id],
        queryFn: async () => {
            if (!user || !session) throw new Error("Not authenticated");
            const res = await fetch(`/api/auth/profile/${user.id}`, {
                headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            if (res.status === 401) {
                console.warn("[Auth] Profile fetch unauthorized - signing out");
                void signOut();
                throw new Error("Unauthorized");
            }
            if (!res.ok) throw new Error("Failed to fetch profile");
            return res.json();
        },
        enabled: !!user && !!session,
        retry: false // Don't spam retries on auth errors
    });

    useEffect(() => {
        if (profileData) {
            setProfile(profileData);
            const orgs = profileData.organizations || (profileData.organization ? [profileData.organization] : []);
            setAllOrganizations(orgs);

            const savedOrgId = localStorage.getItem("nexus_active_org");
            const active = orgs.find((o) => o.id === savedOrgId) || orgs[0] || null;
            setOrganization(active);
            if (active) localStorage.setItem("nexus_active_org", active.id);
        }
    }, [profileData]);

    useEffect(() => {
        // Initial Session Load
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            if (!currentSession) setLoading(false);
        });

        // Auth State Sync
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
            console.log(`[Auth Event] ${event}`);
            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (!currentSession) {
                setProfile(null);
                setOrganization(null);
                setAllOrganizations([]);
                setLoading(false);
                localStorage.removeItem("nexus_active_org");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!isProfileLoading && (profileData || !user || profileError)) {
            setLoading(false);
        }
    }, [isProfileLoading, profileData, user, profileError]);

    const switchOrganization = async (orgId: string) => {
        const target = allOrganizations.find(o => o.id === orgId);
        if (target) {
            console.log(`[Auth] Switching to organization: ${target.name} (${target.id})`);
            setLoading(true);
            localStorage.setItem("nexus_active_org", target.id);
            setOrganization(target);

            // Invalidate all queries to trigger refresh with new organization header
            await queryClient.invalidateQueries();

            // The profile fetch will trigger the effect that sets loading to false
            // but we add a safety timeout or just wait for invalidation
            setTimeout(() => { setLoading(false); }, 500);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        const loginPath = "/login";
        setLocation(loginPath);
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

/**
 * Hook to access the current authentication state and actions.
 */
export const useAuth = () => useContext(AuthContext);
