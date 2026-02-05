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
import Dashboard from "@/pages/Dashboard";
import Vision from "@/pages/Vision";
import Kiosks from "@/pages/Kiosks";
import KioskInterface from "@/pages/KioskInterface";
import DriverTerminal from "@/pages/DriverTerminal";
import Employees from "@/pages/Employees";
import Inventory from "@/pages/Inventory";
import Production from "@/pages/Production";
import Sales from "@/pages/Sales";
import Logistics from "@/pages/Logistics";
import Finance from "@/pages/Finance";
import BankAccounts from "@/pages/finance/BankAccounts";
import PayrollManager from "@/pages/finance/PayrollManager";
import FinancialReports from "@/pages/FinancialReports";
import CRM from "@/pages/CRM";
import Purchases from "@/pages/Purchases";
import Tickets from "@/pages/Tickets";
import Piecework from "@/pages/Piecework";
import Documents from "@/pages/Documents";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import TrustNet from "@/pages/TrustNet";
import Admin from "@/pages/Admin";
import Query from "@/pages/Query";
import Marketplace from "@/pages/Marketplace";
import Demo from "@/pages/Demo";
import TerminalLink from "@/pages/TerminalLink";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import WorkflowEditor from "@/pages/WorkflowEditor";
import Workflows from "@/pages/Workflows";
import Operations from "@/pages/Operations";
import Kiosk from "@/pages/Kiosk";
import Signature from "@/pages/Signature";

import { AuthProvider } from "@/hooks/use-auth";
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
      <Route path="/kiosk-link" component={TerminalLink} />
      <Route path="/sign/:token" component={Signature} />

      {/* Protected System Routes (Admin/Owner/Manager only) */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/vision" component={Vision} />
      <ProtectedRoute path="/kiosks" component={Kiosks} /> {/* Mangement of Kiosks */}
      <ProtectedRoute path="/employees" component={Employees} />
      <ProtectedRoute path="/inventory" component={Inventory} />
      <ProtectedRoute path="/production" component={Production} />
      <ProtectedRoute path="/sales" component={Sales} />
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
      <ProtectedRoute path="/query" component={Query} />
      <ProtectedRoute path="/demo" component={Demo} />
      <ProtectedRoute path="/subscription-success" component={SubscriptionSuccess} />
      <ProtectedRoute path="/workflows" component={Workflows} />
      <ProtectedRoute path="/workflow-editor" component={WorkflowEditor} />

      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Root Application component setting up providers and router.
 * @returns {JSX.Element} The root application component.
 */
import { OnboardingGuard } from "@/components/layout/OnboardingGuard";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfigurationProvider>
          <RealtimeProvider>
            <TooltipProvider>
              <OnboardingProvider>
                <Toaster />
                <CognitiveBridge />
                <Copilot />
                <OnboardingGuard>
                  <Router />
                </OnboardingGuard>
              </OnboardingProvider>
            </TooltipProvider>
          </RealtimeProvider>
        </ConfigurationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
