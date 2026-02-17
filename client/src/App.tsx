import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import { IntroJsOnboarding } from "@/components/onboarding/IntroJsOnboarding";
import { ProtectedRoute } from "@/lib/protected-route";
import { useEffect, Suspense, lazy } from "react";

// Initialize Sentry FIRST
import { initSentry, ErrorBoundary, setUserContext } from "@/lib/sentry";
import { ErrorFallback } from "@/components/ErrorFallback";
initSentry();
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Vision = lazy(() => import("@/pages/Vision"));
const Kiosks = lazy(() => import("@/pages/Kiosks"));
const KioskInterface = lazy(() => import("@/pages/KioskInterface"));
const DriverTerminal = lazy(() => import("@/pages/DriverTerminal"));
const Employees = lazy(() => import("@/pages/Employees"));
const Inventory = lazy(() => import("@/pages/Inventory"));

const ProductionHub = lazy(() => import("@/pages/ProductionHub"));
const Sales = lazy(() => import("@/pages/Sales"));
const Logistics = lazy(() => import("@/pages/Logistics"));
const Finance = lazy(() => import("@/pages/Finance"));
const BankAccounts = lazy(() => import("@/pages/finance/BankAccounts"));
const PayrollManager = lazy(() => import("@/pages/finance/PayrollManager"));
const FinancialReports = lazy(() => import("@/pages/FinancialReports"));
const CRM = lazy(() => import("@/pages/CRM"));
const Purchases = lazy(() => import("@/pages/Purchases"));
const Tickets = lazy(() => import("@/pages/Tickets"));
const Piecework = lazy(() => import("@/pages/Piecework"));
const Documents = lazy(() => import("@/pages/Documents"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Settings = lazy(() => import("@/pages/Settings"));
const TrustNet = lazy(() => import("@/pages/TrustNet"));
const Admin = lazy(() => import("@/pages/Admin"));
const Query = lazy(() => import("@/pages/Query"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const Demo = lazy(() => import("@/pages/Demo"));
const TerminalLink = lazy(() => import("@/pages/TerminalLink"));
const SubscriptionSuccess = lazy(() => import("@/pages/SubscriptionSuccess"));
const WorkflowEditor = lazy(() => import("@/pages/WorkflowEditor"));
const Workflows = lazy(() => import("@/pages/Workflows"));
const Operations = lazy(() => import("@/pages/Operations"));
const Kiosk = lazy(() => import("@/pages/Kiosk"));
const Signature = lazy(() => import("@/pages/Signature"));
const TerminalManager = lazy(() => import("@/pages/admin/TerminalManager"));
const ShieldLine = lazy(() => import("@/pages/ShieldLine"));
const Lending = lazy(() => import("@/pages/Lending"));
const Manufacturing = lazy(() => import("@/pages/Manufacturing"));
const KitchenDisplay = lazy(() => import("@/pages/KitchenDisplay"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const TimeClock = lazy(() => import("@/pages/TimeClock"));
const CustomerDisplay = lazy(() => import("@/pages/CustomerDisplay"));
const SystemHealth = lazy(() => import("@/pages/SystemHealth"));

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { RealtimeProvider } from "@/lib/realtime";
import { Copilot } from "@/components/ai/Copilot";
import { ConfigurationProvider } from "@/context/ConfigurationContext";
import { CognitiveBridge } from "@/lib/cognitive/CognitiveBridge";
import { OnboardingProvider } from "@/context/OnboardingContext";

/**
 * Main Router component handling application routes.
 * @returns {JSX.Element} The router switch based on current path.
 */
function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Auth} />
        <Route path="/signup" component={Auth} />
        <Route path="/onboarding" component={IntroJsOnboarding} />

        {/* Public / Kiosk Routes */}
        <Route path="/kiosk" component={Kiosk} />
        <Route path="/kiosk-terminal/:id" component={KioskInterface} />
        <Route path="/driver" component={DriverTerminal} />
        <Route path="/driver-pwa" component={DriverTerminal} />
        <Route path="/driver-pwa" component={DriverTerminal} />
        <Route path="/kiosk-link" component={TerminalLink} />
        <Route path="/sign/:token" component={Signature} />
        <Route path="/time-clock" component={TimeClock} />
        <Route path="/customer-display" component={CustomerDisplay} />

        {/* Protected System Routes (Admin/Owner/Manager only) */}
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute path="/vision" component={Vision} />
        <ProtectedRoute path="/kiosks" component={Kiosks} />
        <ProtectedRoute path="/employees" component={Employees} />
        <ProtectedRoute path="/inventory" component={Inventory} />

        <ProtectedRoute path="/production" component={ProductionHub} />
        <ProtectedRoute path="/sales" component={Sales} />
        <ProtectedRoute path="/kitchen" component={KitchenDisplay} />
        <ProtectedRoute path="/logistics" component={Logistics} />
        <ProtectedRoute path="/finance" component={Finance} />
        <ProtectedRoute path="/finance/accounts" component={BankAccounts} />
        <ProtectedRoute path="/finance/payroll" component={PayrollManager} />
        <ProtectedRoute path="/finance/reports" component={FinancialReports} />
        <ProtectedRoute path="/crm" component={CRM} />
        <ProtectedRoute path="/marketplace" component={Marketplace} />
        <ProtectedRoute path="/operations" component={Operations} />
        <ProtectedRoute path="/purchases" component={Purchases} />
        <ProtectedRoute path="/tickets" component={Tickets} />
        <ProtectedRoute path="/documents" component={Documents} />
        <ProtectedRoute path="/piecework" component={Piecework} />
        <ProtectedRoute path="/analytics" component={Analytics} />
        <ProtectedRoute path="/settings" component={Settings} />
        <ProtectedRoute path="/trust" component={TrustNet} />
        <ProtectedRoute path="/admin" component={Admin} />
        <ProtectedRoute path="/admin/terminals" component={TerminalManager} />
        <ProtectedRoute path="/query" component={Query} />
        <ProtectedRoute path="/demo" component={Demo} />
        <ProtectedRoute path="/subscription-success" component={SubscriptionSuccess} />
        <ProtectedRoute path="/workflows" component={Workflows} />
        <ProtectedRoute path="/workflow-editor" component={WorkflowEditor} />
        <ProtectedRoute path="/shieldline" component={ShieldLine} />
        <ProtectedRoute path="/lending" component={Lending} />
        <ProtectedRoute path="/manufacturing" component={Manufacturing} />
        <ProtectedRoute path="/settings/integrations" component={Integrations} />
        <ProtectedRoute path="/system-health" component={SystemHealth} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

/**
 * Root Application component setting up providers and router.
 * @returns {JSX.Element} The root application component.
 */
import { OnboardingGuard } from "@/components/layout/OnboardingGuard";

import { useLocation } from "wouter";

/**
 * Root Application component layout to handle conditional global elements
 */
import { initializeEventSubscription } from "@/lib/events";
import { useAnalytics } from "@/lib/analytics";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { PageLoader } from "@/components/ui/PageLoader";

function EventSubscriber() {
  useEffect(() => {
    const cleanup = initializeEventSubscription();
    return () => cleanup && cleanup();
  }, []);
  return null;
}

function PageViewTracker() {
  const { track } = useAnalytics();
  const [location] = useLocation();

  useEffect(() => {
    track({ eventName: location, eventType: 'page_view' });
  }, [location, track]);

  return null;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isKiosk = location.startsWith("/kiosk") || location === "/driver" || location === "/driver-pwa" || location.startsWith("/sign/");

  return (
    <>
      <EventSubscriber />
      <PageViewTracker />
      {!isKiosk && (
        <>
          <Copilot />
          <FeedbackWidget />
        </>
      )}
      {children}
    </>
  );
}

import { useResolutionScaler } from "@/hooks/use-resolution-scaler";

import { MLInitialization } from "@/components/ai/MLInitialization";

function App() {
  useResolutionScaler();
  return (
    <ErrorBoundary fallback={(props) => <ErrorFallback error={props.error as Error} resetError={props.resetError} />} showDialog>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserContextTracker />
          <MLInitialization />
          <ConfigurationProvider>
            <RealtimeProvider>
              <TooltipProvider>
                <OnboardingProvider>
                  <Toaster />
                  <CognitiveBridge />
                  <AppLayout>
                    <OnboardingGuard>
                      <Router />
                    </OnboardingGuard>
                  </AppLayout>
                </OnboardingProvider>
              </TooltipProvider>
            </RealtimeProvider>
          </ConfigurationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Component to track user context in Sentry
function UserContextTracker() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile) {
      setUserContext({
        id: user.id,
        email: user.email || undefined,
        username: profile.user.name || user.email || undefined,
        organizationId: profile.organization?.id || undefined,
      });
    } else if (user) {
      // Fallback if profile is not yet loaded
      setUserContext({
        id: user.id,
        email: user.email || undefined,
      });
    } else {
      setUserContext(null);
    }
  }, [user, profile]);

  return null;
}

// Export App

export default App;
