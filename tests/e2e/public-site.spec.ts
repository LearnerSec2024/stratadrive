import { expect, test } from "@playwright/test";

test("TC-P1A-CONTENT-001 homepage presents the brand, local image and booking entry", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/StrataDrive/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your next step towards confident driving.");
  await expect(page.getByRole("banner").getByRole("link", { name: "Book a lesson" })).toHaveAttribute("href", "/book");
  const image = page.getByRole("img", { name: /Illustrative blue car/ });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText(/Not an actual StrataDrive vehicle or service location/)).toBeVisible();
  await expect(page.getByText(/Service details to be confirmed/)).toBeVisible();
  await expect(page.getByText("To get started", { exact: false })).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0);
});

test("TC-P1A-CONTENT-001 desktop navigation reaches real sections and FAQs disclose actual preview limits", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main navigation", exact: true });
  await navigation.getByRole("link", { name: "Lesson journey" }).click();
  await expect(page).toHaveURL(/#lessons$/);
  await expect(page.getByRole("heading", { name: /Your journey.*Your pace/ })).toBeInViewport();
  await navigation.getByRole("link", { name: "FAQs", exact: true }).click();
  const disclosure = page.locator("summary").filter({ hasText: "Can I book a lesson now?" });
  const answer = page.getByText(/No lesson can be reserved or paid for here/);
  await disclosure.click();
  await expect(answer).toBeVisible();
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(answer).toBeHidden();
  await page.keyboard.press("Space");
  await expect(answer).toBeVisible();
});

test("TC-P1A-CONTENT-001 mobile menu closes on Escape, restores focus and follows section links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
  await expect(navigation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#mobile-navigation")).toBeHidden();
  await toggle.click();
  await navigation.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.locator("#mobile-navigation")).toBeHidden();
  await expect(page.getByRole("heading", { name: /A simpler way to/ })).toBeInViewport();
});

for (const width of [320, 390, 1280]) {
  test(`TC-P1A-CONTENT-001 homepage has no horizontal page overflow at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 390 || width === 1280) {
      await page.screenshot({ path: testInfo.outputPath(`homepage-${width}px.png`), fullPage: true });
    }
  });
}
