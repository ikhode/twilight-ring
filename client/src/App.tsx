import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import { IntroJsOnboarding } from "@/components/onboarding/IntroJsOnboarding";
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
import Operations from "@/pages/Operations";
import Kiosk from "@/pages/Kiosk";

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
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/vision" component={Vision} />
      <Route path="/kiosks" component={Kiosks} />
      <Route path="/kiosk" component={Kiosk} />
      <Route path="/kiosk-terminal/:id" component={KioskInterface} />
      <Route path="/driver" component={DriverTerminal} />
      <Route path="/driver-pwa" component={DriverTerminal} />
      <Route path="/employees" component={Employees} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/production" component={Production} />
      <Route path="/sales" component={Sales} />
      <Route path="/logistics" component={Logistics} />
      <Route path="/finance" component={Finance} />
      <Route path="/finance/accounts" component={BankAccounts} />
      <Route path="/finance/payroll" component={PayrollManager} />
      <Route path="/crm" component={CRM} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/operations" component={Operations} />
      <Route path="/purchases" component={Purchases} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/documents" component={Documents} />
      <Route path="/piecework" component={Piecework} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/trust" component={TrustNet} />
      <Route path="/admin" component={Admin} />
      <Route path="/query" component={Query} />
      <Route path="/demo" component={Demo} />
      <Route path="/kiosk-link" component={TerminalLink} />
      <Route path="/subscription-success" component={SubscriptionSuccess} />
      <Route path="/workflows" component={WorkflowEditor} />
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
