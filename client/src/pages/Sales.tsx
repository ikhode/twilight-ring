import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, LineChart, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

// Components
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { OrderTypeSelector } from "@/components/pos/OrderTypeSelector";
import { OpenOrdersDialog } from "@/components/pos/OpenOrdersDialog";
import { CreateCustomerDialog } from "@/components/pos/CreateCustomerDialog";
import { SalesMetrics } from "@/components/pos/SalesMetrics";
import { SalesTrends } from "@/components/pos/SalesTrends";
import { SalesHistory } from "@/components/pos/SalesHistory";
import { UpsellSuggestion } from "@/components/pos/UpsellSuggestion";

import { CashCountDialog } from "@/components/pos/CashCountDialog";
import { POSView as POSViewComponent } from "@/components/pos/POSView";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

export default function Sales() {
  const [activeTab, setActiveTab] = useState("pos");
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const saleId = params.get("openSaleId");
    if (saleId) {
      setActiveTab("history");
      setOpenSaleId(saleId);
      window.history.replaceState({}, '', '/sales');
    }
  }, []);

  return (
    <AppLayout title="Punto de Venta" subtitle="Ventas y facturación">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="pos" className="gap-2">
                <ShoppingBag className="w-4 h-4" />
                Terminal POS
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-2">
                <LineChart className="w-4 h-4" />
                Tendencias
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                Ventas & Seguimiento
              </TabsTrigger>
            </TabsList>
            <CashCountDialog />
          </div>

          <TabsContent value="pos">
            <POSView />
          </TabsContent>

          <TabsContent value="trends">
            <SalesTrends />
          </TabsContent>

          <TabsContent value="history">
            <SalesHistory openSaleId={openSaleId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}


function POSView() {
  return <POSViewComponent />;
}
