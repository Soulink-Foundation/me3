import { test, expect } from "./fixtures/test";
import { WizardPage } from "./helpers/wizard";

test.describe("Wizard Blog Step", () => {
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

    // Navigate through steps to get to blog (if enabled)
    await wizard.fillBasics("Blog Test", "blogtest", "Testing blog");
    await wizard.waitForUsernameCheck();

    // Skip through required steps
    for (let i = 0; i < 6; i++) {
      await wizard.nextStep();
      await page.waitForTimeout(200);
    }

    // Check if blog step appears (it's optional)
    const stepName = await page.locator(".step-name").textContent();
    if (stepName?.includes("Blog")) {
      // Blog is enabled, we're on the blog step
    } else {
      // Blog is not enabled, skip this test
      test.skip();
    }
  });

  test("should display blog step when enabled", async ({ page }) => {
    await wizard.expectStepName("Blog");
  });

  test("should allow proceeding without adding posts", async ({ page }) => {
    await wizard.expectCanProceed(true);
  });
});
