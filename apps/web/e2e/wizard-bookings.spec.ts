import { test, expect } from "./fixtures/test";
import { WizardPage } from "./helpers/wizard";

test.describe("Wizard Bookings Step", () => {
  let wizard: WizardPage;

  test.beforeEach(async ({ page }) => {
    wizard = new WizardPage(page);

    // Mock Stripe Connect status
    await page.route("**/api/stripe-connect/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "not_connected" }),
      });
    });

    await page.route("**/api/usernames/*/available", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ available: true }),
      });
    });

    await wizard.goto();

    // Navigate to Bookings step (requires enabling bookings first)
    await wizard.fillBasics("Bookings Test", "bookingstest", "Testing Bookings");
    await wizard.waitForUsernameCheck();
    await wizard.nextStep(); // Avatar
    await wizard.nextStep(); // Banner
    await wizard.nextStep(); // Links
    await wizard.nextStep(); // CTA
    await wizard.nextStep(); // Pages
    await wizard.nextStep(); // Additional Features
    
    // Enable bookings feature
    const bookingsToggle = page.locator(
      '.feature-card:has(.feature-name:has-text("Bookings")) .feature-toggle',
    );
    
    if ((await bookingsToggle.count()) > 0) {
      await bookingsToggle.click();
      await page.waitForTimeout(300);
      await expect(
        bookingsToggle.locator('input[type="checkbox"]'),
      ).toBeChecked();
    }
    
    await wizard.nextStep(); // Bookings
  });

  test("should display bookings step", async ({ page }) => {
    await wizard.expectStepName("Bookings");
  });

  test("should show payments section with Stripe connect", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /^Accept Bookings$/i }),
    ).toBeVisible();
    await expect(page.getByText("Connect Stripe")).toBeVisible();
  });

  test("should allow configuring booking settings", async ({ page }) => {
    // Look for booking configuration fields
    const titleInput = page.locator('input[placeholder*="Consultation" i]').first();
    
    if ((await titleInput.count()) > 0) {
      await titleInput.fill("30-min Call");
      await page.waitForTimeout(200);
    }

    // Should be able to proceed
    await wizard.expectCanProceed(true);
  });

  test("should include Dublin and Pakistan timezone options", async ({ page }) => {
    const timezoneSelect = page.locator(
      'select:has(option[value="Asia/Karachi"])',
    );

    await expect(timezoneSelect.locator('option[value="Europe/Dublin"]')).toHaveText(
      "Dublin (GMT/IST)",
    );
    await expect(timezoneSelect.locator('option[value="Asia/Karachi"]')).toHaveText(
      "Pakistan (PKT)",
    );
  });

  test("should allow proceeding without configuring bookings", async ({ page }) => {
    await wizard.expectCanProceed(true);
    await wizard.nextStep();

    // Should proceed to next step (Publish or next enabled feature)
    const stepName = await page.locator(".step-name").textContent();
    expect(stepName).toBeTruthy();
  });
});
