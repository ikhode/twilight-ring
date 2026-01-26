import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
      : []),
  ] as any,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  envDir: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core UI and Framework (Keep very stable)
            if (id.includes('react') || id.includes('react-dom') || id.includes('wouter') || id.includes('scheduler')) {
              return 'vendor-core';
            }
            // Visualization and Charts
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // Maps
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-maps';
            }
            // Onboarding
            if (id.includes('intro.js') || id.includes('driver.js')) {
              return 'vendor-onboarding';
            }
            // UI Component Libraries
            if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('framer-motion') || id.includes('motion')) {
              return 'vendor-ui';
            }
            // Data and Utilities
            if (id.includes('@tanstack') || id.includes('zod') || id.includes('date-fns')) {
              return 'vendor-utils';
            }
            // Payments
            if (id.includes('stripe')) {
              return 'vendor-payments';
            }
            // Note: We removed TensorFlow/AI from here to let Vite handle its complex dependencies
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
