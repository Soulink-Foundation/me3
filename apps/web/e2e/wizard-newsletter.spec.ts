import { test, expect } from "./fixtures/test";
import { WizardPage } from "./helpers/wizard";

test.describe("Wizard Newsletter Step", () => {
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

    // Navigate to Newsletter step (requires enabling newsletter first)
    await wizard.fillBasics("Newsletter Test", "newslettertest", "Testing Newsletter");
    await wizard.waitForUsernameCheck();
    await wizard.nextStep(); // Avatar
    await wizard.nextStep(); // Banner
    await wizard.nextStep(); // Links
    await wizard.nextStep(); // CTA
    await wizard.nextStep(); // Pages
    await wizard.nextStep(); // Additional Features
    
    // Enable newsletter feature
    const newsletterToggle = page.locator(
      '.feature-card:has(.feature-name:has-text("Newsletter")) .feature-toggle',
    );
    
    if ((await newsletterToggle.count()) > 0) {
      await newsletterToggle.click();
      await page.waitForTimeout(300);
      await expect(
        newsletterToggle.locator('input[type="checkbox"]'),
      ).toBeChecked();
    }
    
    await wizard.nextStep(); // Newsletter
  });

  test("should display newsletter step", async ({ page }) => {
    await wizard.expectStepName("Newsletter");
  });

  test("should allow configuring newsletter settings", async ({ page }) => {
    // Look for newsletter configuration fields
    const titleInput = page.locator('input[placeholder*="Weekly" i]').first();
    
    if ((await titleInput.count()) > 0) {
      await titleInput.fill("My Newsletter");
      await page.waitForTimeout(200);
    }

    // Should be able to proceed
    await wizard.expectCanProceed(true);
  });

  test("should allow proceeding without configuring newsletter", async ({ page }) => {
    await wizard.expectCanProceed(true);
    await wizard.nextStep();

    // Should proceed to next step (Publish or next enabled feature)
    const stepName = await page.locator(".step-name").textContent();
    expect(stepName).toBeTruthy();
  });
});
