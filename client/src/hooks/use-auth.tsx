import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useLocation } from "wouter";
import { Organization } from "@shared/core/schema";
import { UserProfile } from "@/types/auth";

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

    const fetchProfile = async (uid: string, currentSession: Session) => {
        try {
            const res = await fetch(`/api/auth/profile/${uid}`, {
                headers: {
                    "Authorization": `Bearer ${currentSession.access_token}`
                }
            });

            if (res.ok) {
                const data = await res.json() as UserProfile;
                setProfile(data);

                // Handle Organizations
                const orgs = data.organizations || (data.organization ? [data.organization] : []);
                setAllOrganizations(orgs);

                // active selection
                const savedOrgId = localStorage.getItem("nexus_active_org");
                const active = orgs.find((o) => o.id === savedOrgId) || orgs[0] || null;

                setOrganization(active);
                if (active) localStorage.setItem("nexus_active_org", active.id);
            }
        } catch (error) {
            console.error("[Auth] Profile fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 1. Initial Load
        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            if (initialSession) {
                fetchProfile(initialSession.user.id, initialSession);
            } else {
                setLoading(false);
            }
        });

        // 2. Auth State Sync
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log(`[Auth Event] ${event}`);
            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession) {
                await fetchProfile(currentSession.user.id, currentSession);
            } else {
                setProfile(null);
                setOrganization(null);
                setAllOrganizations([]);
                setLoading(false);
                localStorage.removeItem("nexus_active_org");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const switchOrganization = async (orgId: string) => {
        const target = allOrganizations.find(o => o.id === orgId);
        if (target) {
            localStorage.setItem("nexus_active_org", target.id);
            window.location.reload();
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
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
