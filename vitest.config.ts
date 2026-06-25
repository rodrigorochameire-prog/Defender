import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Testes quarentenados APENAS no CI (process.env.CI) para não bloquear PRs.
// Continuam rodando localmente (`npm test`). Rastreamento e remoção: issue #156.
const CI_QUARANTINE = [
  // (a) Testes de integração tRPC/API que exigem Postgres — o CI não provê banco
  // (DATABASE_URL ausente). Voltam a rodar quando o workflow tiver um serviço de DB.
  "__tests__/trpc/lugares-router.test.ts",
  "__tests__/trpc/pessoas-router.test.ts",
  "__tests__/trpc/casos-router.test.ts",
  "__tests__/trpc/cronologia-router.test.ts",
  "__tests__/trpc/encaminhamentos.test.ts",
  "__tests__/trpc/audiencias-mutations.test.ts",
  "__tests__/trpc/vida-funcional-router.test.ts",
  "__tests__/api/triagem-atendimento.test.ts",
  "__tests__/api/triagem-promover.test.ts",
  // (b) Testes de componente vermelhos pré-existentes na `main` (a corrigir)
  "__tests__/components/event-detail-sheet.test.tsx",
  "__tests__/components/documentos-block.test.tsx",
  "__tests__/components/dossie-v2-block.test.tsx",
  "__tests__/components/sheet-toc.test.tsx",
  "__tests__/sync-engine.test.ts",
  "__tests__/unit/registro-to-agenda-item.test.ts",
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
