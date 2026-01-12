import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import TimeClock from "@/pages/TimeClock";
import Kiosks from "@/pages/Kiosks";
import Employees from "@/pages/Employees";
import Inventory from "@/pages/Inventory";
import Production from "@/pages/Production";
import Sales from "@/pages/Sales";
import Logistics from "@/pages/Logistics";
import Finance from "@/pages/Finance";
import CRM from "@/pages/CRM";
import Tickets from "@/pages/Tickets";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/timeclock" component={TimeClock} />
      <Route path="/kiosks" component={Kiosks} />
      <Route path="/employees" component={Employees} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/production" component={Production} />
      <Route path="/sales" component={Sales} />
      <Route path="/logistics" component={Logistics} />
      <Route path="/finance" component={Finance} />
      <Route path="/crm" component={CRM} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
