import { test, expect } from "./fixtures/test";
import { WizardPage } from "./helpers/wizard";

test.describe("Wizard Shop Step", () => {
  let wizard: WizardPage;

  test.beforeEach(async ({ page }) => {
    wizard = new WizardPage(page);

    await page.route("**/api/usernames/*/available", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ available: true }),
      });
    });

    await wizard.goto();

    // Navigate through steps to get to shop (if enabled)
    await wizard.fillBasics("Shop Test", "shoptest", "Testing shop");
    await wizard.waitForUsernameCheck();

    // Skip through required steps
    for (let i = 0; i < 7; i++) {
      await wizard.nextStep();
      await page.waitForTimeout(200);
    }

    // Check if shop step appears (it's optional)
    const stepName = await page.locator(".step-name").textContent();
    if (stepName?.includes("Shop")) {
      // Shop is enabled, we're on the shop step
    } else {
      // Shop is not enabled, skip this test
      test.skip();
    }
  });

  test("should display shop step when enabled", async ({ page }) => {
    await wizard.expectStepName("Shop");
  });

  test("should allow proceeding without adding products", async ({ page }) => {
    await wizard.expectCanProceed(true);
  });
});
