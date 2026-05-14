import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["sankhya.png", "favicon.svg"],
      manifest: {
        name: "Suporte Sankhya — GreenCore",
        short_name: "GreenCore",
        description: "Sistema interno de suporte Sankhya: produtos, liberações e clientes.",
        theme_color: "#10b981",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/sankhya.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/sankhya.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/sankhya.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cacheia o shell do app e assets estáticos
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Rotas de API nunca vão para cache — sempre buscam no servidor
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/backend/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      // Replit's edge proxy reserves /api/* paths for its own infra,
      // so the frontend hits /backend/* and we forward those to the API server.
      "/backend": {
        target: "http://127.0.0.1:3002",
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:3002",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
