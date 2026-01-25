import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useLocation } from "wouter";

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: any | null; // Extended profile from our DB
    organization: any | null; // Active Organization
    allOrganizations: any[]; // List of all linked organizations
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
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState<any | null>(null);
    const [allOrganizations, setAllOrganizations] = useState<any[]>([]);
    const [, setLocation] = useLocation();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
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
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setOrganization(null);
                setAllOrganizations([]);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (uid: string) => {
        try {
            // Fetch additional profile data from our API
            const res = await fetch(`/api/auth/profile/${uid}`);
            if (res.ok) {
                const data = await res.json();
                setProfile(data);

                // Handle Multi-Org
                const orgs = data.organizations || (data.organization ? [data.organization] : []);
                setAllOrganizations(orgs);

                // Restore persistent selection or default to first
                const savedOrgId = localStorage.getItem("nexus_active_org");
                const savedOrg = orgs.find((o: any) => o.id === savedOrgId);
                let active = savedOrg || orgs[0] || null;

                // Self-Healing: Fix corrupted names (if name is stringified JSON)
                if (active && active.name?.trim().startsWith("{") && active.name?.includes("name")) {
                    try {
                        const parsed = JSON.parse(active.name);
                        if (parsed.name) {
                            active = { ...active, name: parsed.name };
                            // Ideally we would PATCH this back to server, but for now just fix display
                        }
                    } catch (e) {
                        // Ignore parse error, maybe it's just a name starting with {
                    }
                }

                setOrganization(active);
                if (active) localStorage.setItem("nexus_active_org", active.id);
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
