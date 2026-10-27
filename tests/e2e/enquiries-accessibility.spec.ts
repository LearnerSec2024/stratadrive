import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
});

test("TC-P1B-A11Y-001 labelled form, keyboard focus and errors are accessible", async ({ page }) => {
  await page.goto("/enquire");
  const form = page.getByRole("form", { name: "Lesson enquiry" });
  await expect(form).toBeVisible();
  for (const label of [/^Name/, /^Email address/, /^Message/]) await expect(page.getByLabel(label)).toBeVisible();
  await page.getByLabel(/^Name/).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(/^Email address/)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(/^Message/)).toBeFocused();
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  const summary = form.getByRole("alert");
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(page.getByLabel(/^Name/)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel(/^Name/)).toHaveAttribute("aria-describedby", /\S+/);
  await summary.getByRole("link").first().click();
  await expect(page.getByLabel(/^Name/)).toBeFocused();
  expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
});

test("TC-P1B-A11Y-001 mobile and 200 percent text reflow remain usable without horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/enquire");
  await expect(page.getByLabel(/^Name/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await expect(page.getByRole("button", { name: "Send enquiry", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
});
