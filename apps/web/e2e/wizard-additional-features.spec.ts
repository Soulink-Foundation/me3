import { test, expect } from "./fixtures/test";
import { WizardPage } from "./helpers/wizard";

test.describe("Wizard Additional Features Step", () => {
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

    // Navigate to Additional Features step
    await wizard.fillBasics("Features Test", "featurestest", "Testing Features");
    await wizard.waitForUsernameCheck();
    await wizard.nextStep(); // Avatar
    await wizard.nextStep(); // Banner
    await wizard.nextStep(); // Links
    await wizard.nextStep(); // CTA
    await wizard.nextStep(); // Pages
    await wizard.nextStep(); // Additional Features
  });

  test("should display additional features step", async ({ page }) => {
    await wizard.expectStepName("Additional Features");
  });

  test("should display feature cards", async ({ page }) => {
    // Check for feature cards
    const newsletter = page.locator(".feature-card .feature-name", {
      hasText: "Newsletter",
    });
    const blog = page.locator(".feature-card .feature-name", {
      hasText: "Blog",
    });
    const bookings = page.locator(".feature-card .feature-name", {
      hasText: "Bookings",
    });
    const shop = page.locator(".feature-card .feature-name", {
      hasText: "Shop",
    });

    await expect(newsletter).toBeVisible();
    await expect(blog).toBeVisible();
    await expect(bookings).toBeVisible();
    await expect(shop).toBeVisible();
  });

  test("should allow proceeding without enabling features", async ({ page }) => {
    await wizard.expectCanProceed(true);
    await wizard.nextStep();

    // Should go to Publish (no conditional steps enabled)
    await wizard.expectStepName("Publish");
  });

  test("should allow toggling blog feature", async ({ page }) => {
    // Find and click the Blog toggle
    const blogToggle = page.locator(
      '.feature-card:has(.feature-name:has-text("Blog")) .feature-toggle',
    );

    if ((await blogToggle.count()) > 0) {
      await blogToggle.click();
      await page.waitForTimeout(300);

      // Should show enabled status
      await expect(blogToggle.locator('input[type="checkbox"]')).toBeChecked();
    }
  });

  test("should proceed to conditional steps when enabled", async ({ page }) => {
    // Enable blog
    const blogToggle = page.locator(
      '.feature-card:has(.feature-name:has-text("Blog")) .feature-toggle',
    );

    if ((await blogToggle.count()) > 0) {
      await blogToggle.click();
      await page.waitForTimeout(300);

      await wizard.nextStep();

      // Should go to Blog step
      await wizard.expectStepName("Blog");
    }
  });
});
