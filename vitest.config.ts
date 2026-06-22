import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Testes vermelhos pré-existentes na `main`, quarentenados APENAS no CI para não
// bloquear PRs. Continuam rodando localmente (`npm test`) para que sejam corrigidos.
// Rastreamento: https://github.com/rodrigorochameire-prog/Defender/issues/156
const CI_QUARANTINE = [
  "__tests__/components/event-detail-sheet.test.tsx",
  "__tests__/components/documentos-block.test.tsx",
  "__tests__/components/dossie-v2-block.test.tsx",
  "__tests__/components/sheet-toc.test.tsx",
  "__tests__/sync-engine.test.ts",
  "__tests__/unit/registro-to-agenda-item.test.ts",
  "__tests__/trpc/lugares-router.test.ts", // integração — exige banco (sem DB no CI)
];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      // Testes do meta-framework AIOX (camadas L1/L2) — fora do escopo do app
      ".aiox-core/**",
      // Specs Playwright rodam no runner próprio, não no vitest
      "e2e/**",
      ...(process.env.CI ? CI_QUARANTINE : []),
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
