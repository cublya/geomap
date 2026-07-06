import { expect, test } from "@playwright/test";

/**
 * Screenshot-stable stories: deterministic data, no animation (reduced motion is
 * emulated, which the package honours by jumping to final states).
 */
const STORIES = [
  "maps-choropleth--basic",
  "maps-choropleth--patterns",
  "layers-routes--multi-stop",
  "globe-globe--rotatable",
  "theming-themes--dark",
  "theming-themes--unstyled",
];

for (const id of STORIES) {
  test(`story ${id}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.locator(".cublya-geo").waitFor();
    await page.evaluate(() => document.fonts.ready);
    // One settle frame after fonts/layout.
    await page.waitForTimeout(250);
    await expect(page).toHaveScreenshot(`${id}.png`);
  });
}
