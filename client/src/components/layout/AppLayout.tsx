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
    // All onboarding enforcement is now handled by OnboardingGuard
  }, [location, setLocation, organization, loading]);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <NeuralSearch />
      <div className="min-h-screen bg-background text-foreground overflow-hidden">
        <AliveBackground />

        {/* Desktop Sidebar */}
        <Sidebar className="hidden md:flex" />

        <div className="md:pl-[var(--sidebar-width,260px)] pl-0 transition-all duration-300 min-h-screen relative"
          style={{ "--sidebar-width": `calc(260px * var(--app-scale, 1))` } as React.CSSProperties}>
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
