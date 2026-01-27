
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

/**
 * OnboardingGuard Component
 * 
 * Intercepts navigation for users in organizations with 'pending' onboarding status
 * and redirects them to the /onboarding route.
 * 
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components
 * @returns {JSX.Element} The children or a loading spinner.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const { organization, loading, user } = useAuth();
    const [location, setLocation] = useLocation();

    useEffect(() => {
        // Optimization: Check local flag first
        const isCompletedLocally = localStorage.getItem("nexus_introjs_completed") === "true";
        if (isCompletedLocally) return;

        if (loading) return;

        // Exempt public routes and auth routes
        const publicRoutes = ["/login", "/signup", "/", "/subscription-success"];
        if (publicRoutes.includes(location)) return;

        // If not logged in, we don't enforce org onboarding (Protected routes will handle auth redirect)
        if (!user) return;

        // Check if organization exists and needs onboarding
        // We check for 'pending' status OR if industry is explicitly 'other' (implying default/unset)
        if (organization) {
            const needsOnboarding =
                organization.onboardingStatus === "pending" ||
                (organization.industry === "other" && organization.onboardingStatus !== "completed");

            if (needsOnboarding) {
                if (location !== "/onboarding") {
                    console.log("🚀 Redirecting to onboarding. Status:", organization.onboardingStatus, "Industry:", organization.industry);
                    setLocation("/onboarding");
                }
            } else {
                // If we passed the check, set the flag for future
                localStorage.setItem("nexus_introjs_completed", "true");
            }
        }
    }, [organization, loading, user, location, setLocation]);

    // Only show loader if we have NO user and NO organization yet
    // This prevents the whole app from unmounting and losing state during refreshes
    if (loading && !user && !organization) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-slate-400">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return <div className="contents">{children}</div>;
}
