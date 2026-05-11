import { test, expect } from "./fixtures/test";
import { WizardPage } from "./helpers/wizard";

test.describe("Wizard Call-to-Action Step", () => {
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

    // Navigate to CTA step
    await wizard.fillBasics("CTA Test", "ctatest", "Testing CTA");
    await wizard.waitForUsernameCheck();
    await wizard.nextStep(); // Avatar
    await wizard.nextStep(); // Banner
    await wizard.nextStep(); // Links
    await wizard.nextStep(); // CTA
  });

  test("should display call-to-action step", async ({ page }) => {
    await wizard.expectStepName("Call-to-action");
  });

  test("should allow proceeding without adding buttons", async ({ page }) => {
    await wizard.expectCanProceed(true);
    await wizard.nextStep();

    await wizard.expectStepName("Pages");
  });

  test("should allow adding buttons", async ({ page }) => {
    // Look for add button button
    const addButton = page
      .locator('button:has-text("Add"), button:has-text("Add Button")')
      .first();

    if ((await addButton.count()) > 0) {
      await addButton.click();
      await page.waitForTimeout(300);

      // Should show button form fields
      const textInputs = page.locator('input[type="text"]');
      expect(await textInputs.count()).toBeGreaterThan(0);
    }

    // Should still be able to proceed
    await wizard.expectCanProceed(true);
  });
});
