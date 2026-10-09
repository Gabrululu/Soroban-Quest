import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Server entry is src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    // Nitro only packages the production build; dev uses Vite's own server.
    ...(command === "build" ? [nitro({ preset: "cloudflare-module" })] : []),
    viteReact(),
  ],
  css: { transformer: "lightningcss" },
  optimizeDeps: {
    // Pre-bundle CJS deps up front; pnpm's strict layout hides the nested shim from discovery.
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-router > @tanstack/react-store > use-sync-external-store/shim/with-selector",
    ],
  },
  resolve: {
    // "@/*" and other paths come from tsconfig.json.
    tsconfigPaths: true,
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
