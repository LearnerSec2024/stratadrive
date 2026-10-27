import { expect, test } from "@playwright/test";

test("TC-E2E-001 public application renders with local resources", async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL!).origin;
  const blockedRequests: string[] = [];
  const pageErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      blockedRequests.push(route.request().url());
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your next step towards confident driving.",
  );
  expect(new URL(page.url()).origin).toBe(origin);
  expect(blockedRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});
