import { test, expect } from "@playwright/test";

const MOBILE = { width: 390, height: 844 };

test.describe("Mobile shell: no horizontal overflow", () => {
  test.use({ viewport: MOBILE });

  test("login page fits a 390px viewport", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });
    // No element pushes the document wider than the viewport.
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflow, "document should not scroll horizontally").toBeLessThanOrEqual(1);
  });
});
