import { expect, test } from "@playwright/test";

test("the app loads and the WebAssembly engine answers", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByTestId("engine")).toContainText(/Engine .+ v\d+\.\d+\.\d+ \(wasm\)/, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test("no horizontal scrolling at any width (works on every screen)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("engine")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the page is cross-origin isolated (needed for threaded WebAssembly)", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
});
