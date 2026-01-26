import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

import { AliveBackground } from "./AliveBackground";

import { NeuralSearch } from "@/components/cognitive/NeuralSearch";

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const { organization, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Onboarding Enforcement
    // If authenticated but organization onboarding is pending, force them to the onboarding page
    if (organization?.onboardingStatus === 'pending' && location !== '/onboarding') {
      const t = setTimeout(() => setLocation('/onboarding'), 100);
      return () => clearTimeout(t);
    }

    // Default legacy enforcement for tour active state
    const isCompleted = localStorage.getItem('nexus_introjs_completed');
    const isTourActive = localStorage.getItem('nexus_tour_active');

    if (!isCompleted && !isTourActive && location !== '/onboarding' && organization?.onboardingStatus === 'completed') {
      // If DB says completed but local tour isn't done (maybe new device), let them decide, but here we enforce tour
      // Or we can just let it be. The user wants to choose experience first.
    }
  }, [location, setLocation, organization, loading]);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <NeuralSearch />
      <div className="min-h-screen bg-background text-foreground overflow-hidden">
        <AliveBackground />

        {/* Desktop Sidebar */}
        <Sidebar className="hidden md:flex" />

        <div className="md:pl-[260px] pl-0 transition-all duration-300 min-h-screen relative">
          <Header title={title} subtitle={subtitle}>
            {/* Mobile Trigger */}
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-foreground">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
          </Header>

          <main className="p-4 md:p-6 pb-24 max-w-[100vw] overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Sidebar Content */}
      <SheetContent side="left" className="p-0 border-r border-sidebar-border bg-sidebar w-[280px]">
        <Sidebar className="w-full h-full relative" onLinkClick={() => setMobileOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
