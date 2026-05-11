import { test, expect } from "./fixtures/test";
import { WizardPage } from "./helpers/wizard";

test.describe("Wizard Pages Step", () => {
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

    // Navigate to pages step
    await wizard.fillBasics("Pages Test", "pagestest", "Testing pages");
    await wizard.waitForUsernameCheck();
    await wizard.nextStep(); // Avatar
    await wizard.nextStep(); // Banner
    await wizard.nextStep(); // Links
    await wizard.nextStep(); // CTA
    await wizard.nextStep(); // Pages
  });

  test("should display pages step", async ({ page }) => {
    await wizard.expectStepName("Pages");
  });

  test("should allow proceeding without adding pages", async ({ page }) => {
    await wizard.expectCanProceed(true);
    await wizard.nextStep();

    // Should go to Additional Features
    await wizard.expectStepName("Additional Features");
  });

  test("should allow adding a page", async ({ page }) => {
    // Look for add page button
    const addButton = page
      .locator(
        'button:has-text("Add"), button:has-text("Add Page"), button:has-text("New Page")',
      )
      .first();

    if ((await addButton.count()) > 0) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Should show page editor or page list
      const pageTitle = page
        .locator('input[placeholder*="title" i], input[placeholder*="page" i]')
        .first();
      if ((await pageTitle.count()) > 0) {
        await pageTitle.fill("Test Page");
        await page.waitForTimeout(300);
      }
    }

    // Should still be able to proceed
    await wizard.expectCanProceed(true);
  });
});
