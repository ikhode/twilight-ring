import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAuthRoutes } from "./routes/auth";
import { registerModuleRoutes } from "./routes/modules";
import { registerAIRoutes } from "./routes/ai";
import { registerCPERoutes } from "./routes/cpe";
import { seedModules } from "./seed";
import { seedCPE } from "./seed_cpe";
import { seedAuth } from "./seed_auth";
import { seedOperations } from "./seed_operations";
import { seedDocumentation } from "./scripts/seed-documentation";
import { seedCashierData } from "./seed-cashier";
import { onboardingRoutes } from "./routes/onboarding";
import dashboardRoutes from "./routes/dashboard";
import operationsRoutes from "./routes/operations";
import crmRoutes from "./routes/crm";
import analyticsRoutes from "./routes/analytics";
import { hrRoutes } from "./routes/hr";
import { cognitiveRoutes } from "./routes/cognitive";
import { trustRoutes } from "./routes/trust";
import { configRoutes } from "./routes/config";
import { searchRoutes } from "./routes/search";
import { whatsappRoutes } from "./routes/whatsapp";
import { kioskRoutes } from "./routes/kiosks";
import productionRoutes from "./routes/production";
import logisticsRoutes from "./routes/logistics";
import { registerChatRoutes } from "./routes/chat";
import { registerDocumentationRoutes } from "./routes/documentation";
import { registerAdminRoutes } from "./routes/admin";
import { registerNLQueryRoutes } from "./routes/nl-query";
import { registerModuleMarketplaceRoutes } from "./routes/module-marketplace";
import { registerSubscriptionRoutes } from "./routes/subscriptions";
import { registerAutomationRoutes } from "./routes/automation";
import { registerBusinessDocumentRoutes } from "./routes/business-documents";
import { financeRoutes } from "./routes/finance";
import { organizationRoutes } from "./routes/organization";
import { attendanceRoutes } from "./routes/attendance";
import { pieceworkRoutes } from "./routes/piecework";
import salesRoutes from "./routes/sales";
import purchasesRoutes from "./routes/purchases";
import inventoryRoutes from "./routes/inventory";
import tensorRoutes from "./routes/tensors";
import notificationsRoutes from "./routes/notifications";
import salesWidgetsRoutes from "./routes/sales-widgets";
import productionBatchesRoutes from "./routes/production-batches";
import driverTrackingRoutes from "./routes/driver-tracking";
import driverRoutesRoutes from "./routes/driver-routes";
import { requireModule } from "./middleware/moduleGuard";





export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Always seed system metadata on startup (idempotent)
  console.log("⚙️ Syncing system metadata (Modules & Documentation)...");
  await seedModules();
  await seedDocumentation();

  // Seed optional demo data if SEED=true
  if (process.env.SEED === "true") {
    console.log("🌱 Seeding demo data...");
    await seedAuth();
    await seedCPE();
    await seedOperations();
    await seedCashierData();
    console.log("✅ Demo data seeded.");
  } else {
    console.log("ℹ️ Skipping demo data seed. set SEED=true to enable.");
  }

  // Register all route modules
  registerAuthRoutes(app);

  // Public/Kiosk Routes
  app.use("/api/kiosks", kioskRoutes);

  // Apply authentication guard to all subsequent API routes
  const { requireAuth } = await import("./auth_util");
  app.use("/api", requireAuth);

  registerModuleRoutes(app);
  registerAIRoutes(app);
  registerSubscriptionRoutes(app);
  registerAutomationRoutes(app);

  // Core / Unprotected or Base
  app.use("/api/onboarding", onboardingRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/organization", organizationRoutes);
  app.use("/api/config", configRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/whatsapp", whatsappRoutes); // Core Comms
  app.use("/api/notifications", notificationsRoutes); // System notifications


  // --- PROTECTED MODULES ---


  // --- PROTECTED MODULES ---


  // ... existing imports ...

  // In registerRoutes function:

  // Operations / Production
  app.use("/api/production", requireModule("/production"), productionRoutes);
  app.use("/api/operations", requireModule("/operations"), operationsRoutes);
  app.use("/api/logistics", requireModule("/logistics"), logisticsRoutes);
  app.use("/api/logistics", driverTrackingRoutes); // Driver GPS tracking (no module guard for kiosks)
  app.use("/api/logistics", driverRoutesRoutes); // Driver routes and delivery completion (no module guard for kiosks)
  app.use("/api/inventory", requireModule("/inventory"), inventoryRoutes); // Protected Inventory Logic

  registerCPERoutes(app);
  // Piecework
  app.use("/api/piecework", requireModule("/piecework"), pieceworkRoutes);

  // Production batches (no module guard for kiosks)
  app.use("/api/production", productionBatchesRoutes);

  // CRM / Sales
  app.use("/api/crm", requireModule("/crm"), crmRoutes);
  app.use("/api/sales", requireModule("/sales"), salesRoutes);
  app.use("/api/sales", salesWidgetsRoutes); // Sales widgets (funnel, top customers, trends)

  // HR
  app.use("/api/hr", requireModule("/employees"), hrRoutes);
  app.use("/api/hr/attendance", requireModule("/employees"), attendanceRoutes);

  // Finance
  app.use("/api/finance", requireModule("/finance"), financeRoutes);
  app.use("/api/purchases", requireModule("/purchases"), purchasesRoutes); // Purchases typically finance

  // Analytics
  app.use("/api/analytics", requireModule("/analytics"), analyticsRoutes);
  app.use("/api/analytics/tensors", tensorRoutes); // Tensor data for AI/ML


  // Specialized
  app.use("/api/cognitive", cognitiveRoutes); // Core AI?
  app.use("/api/trust", trustRoutes);
  // app.use("/api/kiosks", kioskRoutes); // Moved up before requireAuth

  // AI Documentation & Chat
  registerChatRoutes(app);
  registerDocumentationRoutes(app);
  registerBusinessDocumentRoutes(app); // Smart Inbox
  registerAdminRoutes(app);
  registerNLQueryRoutes(app);

  // Module Marketplace
  registerModuleMarketplaceRoutes(app);


  return httpServer;
}
