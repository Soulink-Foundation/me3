import { test, expect } from "./fixtures/test";
import { WizardPage } from "./helpers/wizard";
import { TEST_PNG_1X1, dataUrlToFile } from "./fixtures/test-images";

test.describe("Wizard Avatar Step", () => {
  let wizard: WizardPage;

  test.beforeEach(async ({ page }) => {
    wizard = new WizardPage(page);

    // Mock username availability API
    await page.route("**/api/usernames/*/available", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ available: true }),
      });
    });

    await wizard.goto();

    // Navigate to avatar step
    await wizard.fillBasics("Avatar Test", "avatartest", "Testing avatar");
    await wizard.waitForUsernameCheck();
    await wizard.nextStep();
  });

  test("should display avatar step", async ({ page }) => {
    await wizard.expectStepName("Avatar");
  });

  test("should allow skipping avatar step", async ({ page }) => {
    await wizard.nextStep();

    // Should proceed to next step (Banner)
    await wizard.expectStepName("Banner");
  });

  test("should show file input for avatar upload", async ({ page }) => {
    // Look for file input (might be hidden, so check for upload button or label)
    const uploadButton = page
      .locator(
        'input[type="file"], button:has-text("Upload"), label:has-text("Upload")',
      )
      .first();

    // File input should exist (even if hidden)
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    expect(count).toBeGreaterThan(0);
  });
});
