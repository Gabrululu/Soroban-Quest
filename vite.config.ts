import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

/**
 * Source maps for Sentry, only when the build has an auth token (Cloudflare build variable).
 * Maps are "hidden" (no sourceMappingURL) and deleted after upload; scripts/strip-sourcemaps.mjs
 * also removes any left in the public folder, so source code is never served.
 */
const sentryAuthToken = process.env["SENTRY_AUTH_TOKEN"] ?? "";
const sentryProject = process.env["SENTRY_PROJECT"] ?? "";
const uploadSourceMaps = sentryAuthToken !== "" && sentryProject !== "";

export default defineConfig(({ command }) => ({
  build: { sourcemap: uploadSourceMaps ? "hidden" : false },
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
    ...(command === "build" && uploadSourceMaps
      ? [
          sentryVitePlugin({
            org: process.env["SENTRY_ORG"] ?? "gabrululu",
            project: sentryProject,
            authToken: sentryAuthToken,
            telemetry: false,
            sourcemaps: { filesToDeleteAfterUpload: ["./.output/public/**/*.map"] },
          }),
        ]
      : []),
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
