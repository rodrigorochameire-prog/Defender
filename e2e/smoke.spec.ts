import { test, expect } from "@playwright/test";

test.describe("Smoke: app boots", () => {
  test("root page loads without critical console errors", async ({ page }) => {
    const criticalErrors: string[] = [];
    page.on("pageerror", (err) => criticalErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore known-harmless errors (404s for favicons, third-party scripts)
        if (text.includes("favicon") || text.includes("googletagmanager")) return;
        criticalErrors.push(text);
      }
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30000 });
    expect(response?.status()).toBeLessThan(500);

    // Wait a bit for any deferred errors
    await page.waitForTimeout(500);

    if (criticalErrors.length > 0) {
      console.log("Console errors:", criticalErrors);
    }
    expect(criticalErrors, `Console errors: ${criticalErrors.join("; ")}`).toHaveLength(0);
  });
});

test.describe.skip("Agenda sheet (manual run — requires auth)", () => {
  test("abre evento no sheet, depoente único, footer com Concluir/Redesignar", async ({ page }) => {
    // Requires logged-in session. Run manually with:
    //   npm run dev (in one terminal)
    //   npx playwright test e2e/smoke.spec.ts --ui  (after logging in via UI)
    await page.goto("/admin/agenda");
    const firstEvent = page.locator('[data-evento-card]').first();
    await firstEvent.click();

    const sheet = page.getByRole("dialog", { name: /detalhes do evento/i });
    await expect(sheet).toBeVisible();

    // ToC presente
    await expect(page.getByRole("navigation", { name: /navegação do sheet/i })).toBeVisible();

    // Regression: Depoentes bloco deve aparecer uma única vez
    const depoentesHeader = page.locator('button').filter({ hasText: /^DEPOENTES/i });
    await expect(depoentesHeader).toHaveCount(1);

    // Footer com Concluir + Redesignar
    await expect(page.getByRole("button", { name: /concluir/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /redesignar/i }).first()).toBeVisible();
  });
});

// Baseline de regressão do módulo Atendimentos (Fase 0.3 do redesign).
// Rede de segurança ANTES das refatorações das Fases 1–7: garante que a jornada
// principal (render → trocar view → abrir workspace → abrir form/agendar retorno)
// continua íntegra. Requer sessão logada — rodar manualmente:
//   npm run dev   (em um terminal)
//   npx playwright test e2e/smoke.spec.ts --ui   (após logar pela UI)
test.describe.skip("Atendimentos baseline (manual run — requires auth)", () => {
  test("jornada principal: lista → trocar view → workspace → agendar retorno", async ({ page }) => {
    await page.goto("/admin/atendimentos");

    // Header do módulo: CTA primário e alternância de vistas (Lista/Cards/Calendário).
    await expect(page.getByRole("button", { name: "Novo atendimento" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Lista" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cards" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Calendário" })).toBeVisible();

    // Modos operacionais (segmentação semântica) — substituem as pills de status.
    await expect(page.getByRole("button", { name: "Visão geral" })).toBeVisible();
    await expect(page.getByRole("button", { name: "A registrar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Histórico" })).toBeVisible();
    // Garante o modo "Visão geral" (lista cheia) antes de trocar de vista.
    await page.getByRole("button", { name: "Visão geral" }).click();

    // Trocar para a vista Cards e garantir que itens renderizam.
    await page.getByRole("button", { name: "Cards" }).click();
    const cards = page.locator("[data-atendimento-card]");
    await expect(cards.first()).toBeVisible();

    // Abrir o workspace (sheet de detalhe) a partir do primeiro item.
    await cards.first().click();
    const sheet = page.getByRole("dialog", { name: /detalhes do atendimento/i });
    await expect(sheet).toBeVisible();

    // Pontes de continuidade do caso: agendar retorno + gerar demanda.
    await expect(page.getByRole("button", { name: /agendar retorno/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /gerar demanda/i }).first()).toBeVisible();
  });

  test("abre o modal de novo atendimento pelo CTA do header", async ({ page }) => {
    await page.goto("/admin/atendimentos");
    await page.getByRole("button", { name: "Novo atendimento" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Novo atendimento")).toBeVisible();
  });
});
