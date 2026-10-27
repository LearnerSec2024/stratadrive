import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const route of ["/", "/book"]) {
  for (const width of [390, 1280]) {
    test(`TC-P1A-A11Y-001 ${route} passes scoped automated accessibility at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
  }
}

test("TC-P1A-A11Y-001 skip link moves keyboard focus into main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("TC-P1A-A11Y-001 reduced motion disables smooth scrolling and button transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  const button = page.getByRole("banner").getByRole("link", { name: "Book a lesson" });
  expect(await button.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
});
