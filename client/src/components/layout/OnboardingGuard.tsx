
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

    const isTourActive = localStorage.getItem('nexus_tour_active') === 'true';

    const needsOnboarding = organization && (
        organization.onboardingStatus === "pending" ||
        (organization.industry === "other" && organization.onboardingStatus !== "completed")
    );

    useEffect(() => {
        if (loading || !user || !organization) return;

        // Exempt public routes and auth routes
        const publicRoutes = ["/login", "/signup", "/", "/subscription-success"];
        if (publicRoutes.includes(location)) return;

        // Check if organization needs onboarding and no tour is active
        if (needsOnboarding && !isTourActive) {
            if (location !== "/onboarding") {
                console.log("🚀 Redirecting to onboarding. Status:", organization.onboardingStatus, "Industry:", organization.industry);
                setLocation("/onboarding");
            }
        }
    }, [organization, loading, user, location, setLocation, needsOnboarding, isTourActive]);

    // Show loader while loading or if we are about to redirect
    const isRedirecting = user && organization && needsOnboarding && location !== "/onboarding" && !isTourActive;

    if (loading || isRedirecting) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-slate-400">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return <div className="contents">{children}</div>;
}
