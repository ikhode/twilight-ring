import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

import { AliveBackground } from "./AliveBackground";

import { NeuralSearch } from "@/components/cognitive/NeuralSearch";

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <NeuralSearch />
      <div className="min-h-screen bg-[#020617] text-white overflow-hidden">

        <AliveBackground />

        {/* Desktop Sidebar */}
        <Sidebar className="hidden md:flex" />

        <div className="md:pl-[260px] pl-0 transition-all duration-300 min-h-screen relative">
          <Header title={title} subtitle={subtitle}>
            {/* Mobile Trigger */}
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-white">
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
      <SheetContent side="left" className="p-0 border-r border-white/10 bg-[#020617] w-[280px]">
        <Sidebar className="w-full h-full relative" onLinkClick={() => setMobileOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
