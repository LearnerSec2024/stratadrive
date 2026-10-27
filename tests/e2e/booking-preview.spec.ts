import { expect, test } from "@playwright/test";

test("TC-P1A-E2E-001 booking entry leads to a clearly disclosed preview without personal fields", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Book a lesson" }).click();
  await expect(page).toHaveURL(/\/book$/);
  await expect(page).toHaveTitle(/Booking preview.*StrataDrive/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Explore your lesson journey.");
  await expect(page.getByText("Online booking is not available in this preview.", { exact: true })).toBeVisible();
  await expect(page.locator('input:not([type="radio"]), textarea, select, form')).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(3);
});

test("TC-P1A-E2E-001 preference, availability and next-step journey never sends a mutation or reservation", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", (request) => { if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) mutations.push(request.url()); });
  await page.goto("/book");
  await page.getByRole("radio", { name: /I'm new to driving/ }).check();
  await page.getByRole("button", { name: "Continue to availability" }).click();
  const availabilityHeading = page.getByRole("heading", { name: "Availability will live here." });
  await expect(availabilityHeading).toBeVisible();
  await expect(availabilityHeading).toBeFocused();
  await expect(page.getByRole("heading", { name: "No live availability" })).toBeVisible();
  await expect(page.locator('input[type="date"], input[type="time"]')).toHaveCount(0);
  await page.getByRole("button", { name: /See what.s next/ }).click();
  await expect(page.getByText("No lesson has been booked.", { exact: true })).toBeVisible();
  await expect(page.getByText("I'm new to driving", { exact: true })).toBeVisible();
  await expect(page.getByText("Not connected", { exact: true })).toBeVisible();
  expect(mutations).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  await page.getByRole("button", { name: "Start again" }).click();
  await expect(page.getByRole("heading", { name: "Every journey starts somewhere." })).toBeFocused();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
});

test("TC-P1A-E2E-001 refresh clears transient preferences and direct steps remain honest", async ({ page }) => {
  await page.goto("/book");
  await page.getByRole("radio", { name: /I've practised before/ }).check();
  await page.reload();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
  await page.getByRole("navigation", { name: "Booking preview steps" }).getByRole("button", { name: /3.*What's next/ }).click();
  await expect(page.getByText("Not selected", { exact: true })).toBeVisible();
  await expect(page.getByText("No lesson has been booked.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("TC-P1A-E2E-001 radio preferences support keyboard controls", async ({ page }) => {
  await page.goto("/book");
  const first = page.getByRole("radio", { name: /I'm new to driving/ });
  const second = page.getByRole("radio", { name: /I've practised before/ });
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(second).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Continue to availability" })).toBeFocused();
});

test("TC-P1A-E2E-001 mobile preview works at every step without overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/book");
  await page.screenshot({ path: testInfo.outputPath("booking-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Continue to availability" }).click();
  await expect(page.getByRole("heading", { name: "No live availability" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: /See what.s next/ }).click();
  await expect(page.getByText("No lesson has been booked.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
