import { expect, test } from "@playwright/test";

test("TC-HTTP-001 public application serves HTML without a redirect", async ({
  request,
  baseURL,
}) => {
  // This is an HTTP harness smoke test, not business API contract coverage.
  const response = await request.get("/", { maxRedirects: 0 });

  expect(response.status()).toBe(200);
  expect(new URL(response.url()).origin).toBe(new URL(baseURL!).origin);
  expect(response.headers()["content-type"]).toMatch(/^text\/html\b/i);
  const html = await response.text();
  expect(html).toContain("<main");
  expect(html).toContain("StrataDrive");
});

test("TC-HTTP-001 booking preview serves HTML without a business API", async ({ request }) => {
  const response = await request.get("/book", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^text\/html\b/i);
  expect(await response.text()).toContain("Online booking is not available in this preview.");
});
