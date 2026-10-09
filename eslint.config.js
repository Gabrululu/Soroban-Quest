import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi", "contracts/target", ".stellar-e2e"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          // shadcn/ui variant helpers and context hooks live next to their components by design.
          allowExportNames: [
            "badgeVariants",
            "buttonVariants",
            "toggleVariants",
            "navigationMenuTriggerStyle",
            "useFormField",
            "useSidebar",
            "useProgress",
          ],
        },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // TanStack file routes export `Route`; the router plugin handles their hot reload.
    files: ["src/routes/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Vendored shadcn/ui code: keep it as generated instead of rewriting it for React Compiler rules.
    files: ["src/components/ui/**/*.tsx", "src/hooks/**/*.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  eslintPluginPrettier,
);
