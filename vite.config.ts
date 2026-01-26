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
            // Core UI and Framework
            if (id.includes('react') || id.includes('react-dom') || id.includes('wouter')) {
              return 'react-core';
            }
            // Heavy AI/ML Libraries
            if (id.includes('@tensorflow') || id.includes('face-api') || id.includes('@vladmandic')) {
              return 'ai-vendor';
            }
            // Visualization and Charts
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts-vendor';
            }
            // Maps
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'maps-vendor';
            }
            // Onboarding
            if (id.includes('intro.js') || id.includes('driver.js')) {
              return 'onboarding-vendor';
            }
            // UI Component Libraries
            if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('framer-motion') || id.includes('motion')) {
              return 'ui-vendor';
            }
            // Data and Utilities
            if (id.includes('@tanstack') || id.includes('zod') || id.includes('date-fns')) {
              return 'utils-vendor';
            }
            // Payments
            if (id.includes('stripe')) {
              return 'payments-vendor';
            }
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
