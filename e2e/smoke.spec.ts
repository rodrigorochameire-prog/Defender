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
