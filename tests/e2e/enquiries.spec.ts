import { test, expect, type Page } from "@playwright/test";
import { closeEnquiryFixtures, countEnquiries, resetEnquiries, sampleEnquiry } from "../helpers/enquiries-fixtures";

test.beforeEach(async ({ page, baseURL }) => {
  await resetEnquiries();
  const origin = new URL(baseURL!).origin;
  await page.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
});
test.afterAll(async () => closeEnquiryFixtures());

async function fillSample(page: Page, name = sampleEnquiry.name) {
  await page.getByLabel(/^Name/).fill(name);
  await page.getByLabel(/^Email address/).fill(sampleEnquiry.email);
  await page.getByLabel(/^Message/).fill(sampleEnquiry.message);
}

test("TC-P1B-E2E-001 saves a real synthetic enquiry and truthfully describes its scope", async ({ page }) => {
  await page.goto("/enquire");
  await expect(page.getByRole("form", { name: "Lesson enquiry" })).toBeVisible();
  await expect(page.getByText("A name, a reply address, and what you have in mind. Use made-up details for this local preview.", { exact: true })).toBeVisible();
  await expect(page.getByText("Use a sample address. This preview does not send email.", { exact: true })).toBeVisible();
  await fillSample(page);
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your enquiry has been saved.", exact: true })).toBeVisible();
  await expect(page.getByText("No lesson has been booked. This preview sends no email.", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toBeFocused();
  expect(await countEnquiries()).toBe(1);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, search: location.search }))).toEqual({ local: 0, session: 0, search: "" });
  await page.getByRole("button", { name: "Start another enquiry", exact: true }).click();
  await expect(page.getByLabel(/^Name/)).toHaveValue("");
  await expect(page.getByLabel(/^Email address/)).toHaveValue("");
});

test("TC-P1B-E2E-001 lost response retains a frozen draft and reuses its intent to confirm one saved row", async ({ page }) => {
  const intents: Array<{ key: string | undefined; body: string | null }> = [];
  await page.route("**/api/v1/enquiries", async (route) => {
    intents.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData() });
    if (intents.length === 1) {
      const saved = await route.fetch();
      expect(saved.status()).toBe(201);
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto("/enquire");
  await fillSample(page);
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  await expect(page.getByRole("form", { name: "Lesson enquiry" }).getByRole("alert")).toBeVisible();
  await expect(page.getByRole("form", { name: "Lesson enquiry" }).getByRole("alert")).toBeFocused();
  await expect(page.getByText(/may have (?:already )?been saved|may have completed|may already be saved/i).first()).toBeVisible();
  await expect(page.getByLabel(/^Name/)).toHaveValue(sampleEnquiry.name);
  await expect(page.getByLabel(/^Email address/)).toHaveValue(sampleEnquiry.email);
  await expect(page.getByLabel(/^Name/)).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Start a different enquiry", exact: true }).click();
  await expect(page.getByRole("group", { name: "Confirm a different enquiry" })).toBeVisible();
  await page.getByRole("button", { name: "Keep this enquiry", exact: true }).click();
  await page.getByRole("button", { name: "Retry enquiry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your enquiry has been saved.", exact: true })).toBeVisible();
  expect(intents).toHaveLength(2);
  expect(intents[0].key).toMatch(/^[0-9a-f-]{36}$/i);
  expect(intents[1]).toEqual(intents[0]);
  expect(await countEnquiries()).toBe(1);
});

test("TC-P1B-E2E-001 starting a different intent after uncertainty requires an explicit choice", async ({ page }) => {
  const keys: Array<string | undefined> = [];
  await page.route("**/api/v1/enquiries", async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    if (keys.length === 1) await route.fulfill({ status: 503, contentType: "application/json", headers: { "Cache-Control": "no-store" }, body: JSON.stringify({ code: "STORAGE_UNAVAILABLE", message: "We could not confirm your enquiry. Please retry." }) });
    else await route.continue();
  });
  await page.goto("/enquire");
  await fillSample(page);
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  await expect(page.getByRole("form", { name: "Lesson enquiry" }).getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your enquiry has been saved.", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Start a different enquiry", exact: true }).click();
  await expect(page.getByRole("group", { name: "Confirm a different enquiry" })).toBeVisible();
  expect(keys).toHaveLength(1);
  await page.getByRole("button", { name: "Start a new enquiry", exact: true }).click();
  await expect(page.getByLabel(/^Name/)).not.toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your enquiry has been saved.", exact: true })).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[1]).not.toEqual(keys[0]);
  expect(await countEnquiries()).toBe(1);
});

test("TC-P1B-E2E-001 pending submission prevents repeat sends and failed save retains the draft", async ({ page }) => {
  let posts = 0;
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/enquiries", async (route) => {
    posts += 1;
    await pending;
    await route.abort("failed");
  });
  await page.goto("/enquire");
  await fillSample(page);
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  try {
    await expect(page.getByRole("button", { name: "Saving enquiry…", exact: true })).toBeDisabled();
    expect(posts).toBe(1);
  } finally { release(); }
  await expect(page.getByRole("form", { name: "Lesson enquiry" }).getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your enquiry has been saved.", exact: true })).toHaveCount(0);
  await expect(page.getByLabel(/^Name/)).toHaveValue(sampleEnquiry.name);
  await expect(page.getByLabel(/^Email address/)).toHaveValue(sampleEnquiry.email);
  await expect(page.getByLabel(/^Message/)).toHaveValue(sampleEnquiry.message);
  expect(posts).toBe(1);
});

test("TC-P1B-E2E-001 browser accepts 100 Unicode name code points and blocks over-limit input", async ({ page }) => {
  let posts = 0;
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/v1/enquiries" && request.method() === "POST") posts += 1; });
  await page.goto("/enquire");
  await fillSample(page, "😀".repeat(101));
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  await expect(page.getByRole("form", { name: "Lesson enquiry" }).getByRole("alert")).toBeVisible();
  expect(posts).toBe(0);
  await page.getByLabel(/^Name/).fill("😀".repeat(100));
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your enquiry has been saved.", exact: true })).toBeVisible();
  expect(posts).toBe(1);
});
