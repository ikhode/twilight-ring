import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAuthRoutes } from "./routes/auth";
import { registerModuleRoutes } from "./routes/modules";
import { registerAIRoutes } from "./routes/ai";
import { registerCPERoutes } from "./routes/cpe";
import { registerPieceworkRoutes } from "./routes/piecework";
import { seedModules } from "./seed";
import { seedCPE } from "./seed_cpe";
import { seedAuth } from "./seed_auth";
import { seedOperations } from "./seed_operations";
import { seedDocumentation } from "./scripts/seed-documentation";
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
import salesRoutes from "./routes/sales";
import purchasesRoutes from "./routes/purchases";

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
    console.log("✅ Demo data seeded.");
  } else {
    console.log("ℹ️ Skipping demo data seed. set SEED=true to enable.");
  }

  // Register all route modules
  registerAuthRoutes(app);
  registerModuleRoutes(app);
  registerAIRoutes(app);
  registerCPERoutes(app);
  registerPieceworkRoutes(app); // Fixed: Was missing
  registerSubscriptionRoutes(app);
  registerAutomationRoutes(app);
  app.use("/api/onboarding", onboardingRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/operations", operationsRoutes);
  app.use("/api/crm", crmRoutes);
  app.use("/api/hr", hrRoutes);
  app.use("/api/hr/attendance", attendanceRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/cognitive", cognitiveRoutes);
  app.use("/api/trust", trustRoutes);
  app.use("/api/config", configRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/whatsapp", whatsappRoutes);
  app.use("/api/kiosks", kioskRoutes);
  app.use("/api/production", productionRoutes);
  app.use("/api/finance", financeRoutes);
  app.use("/api/organization", organizationRoutes);
  app.use("/api/sales", salesRoutes);
  app.use("/api/purchases", purchasesRoutes);

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
