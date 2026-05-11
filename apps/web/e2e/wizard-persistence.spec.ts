import { test, expect } from "./fixtures/test";
import { WizardPage } from "./helpers/wizard";

test.describe("Wizard Persistence", () => {
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
  });

  test("should persist wizard state to localStorage", async ({
    page,
    context,
  }) => {
    await wizard.goto();

    // Fill in basics
    await wizard.fillBasics("Test User", "testuser", "Test bio");
    await wizard.waitForUsernameCheck();

    // Navigate to next step
    await wizard.nextStep();

    // Check localStorage has the state
    const storageState = await page.evaluate(() => {
      return localStorage.getItem("me3_wizard_state");
    });

    expect(storageState).not.toBeNull();
    const state = JSON.parse(storageState!);
    expect(state.profile.name).toBe("Test User");
    expect(state.profile.handle).toBe("testuser");
    expect(state.profile.bio).toBe("Test bio");
    expect(state.currentStep).toBe(2);
  });

  test("should restore wizard state from localStorage on reload", async ({
    page,
  }) => {
    await wizard.goto();

    // Fill in basics and navigate
    await wizard.fillBasics("Restored User", "restored", "Restored bio");
    await wizard.waitForUsernameCheck();
    await wizard.nextStep();

    // Reload the page
    await page.reload();

    // Wait for state to restore
    await expect(page.locator(".step-current")).toHaveText("2");

    // Go back to basics to confirm values
    await wizard.prevStep();

    const nameValue = await page.locator("#name").inputValue();
    const handleValue = await page.locator("#handle").inputValue();
    const bioValue = await page.locator("#bio").inputValue();
    const currentStep = await wizard.getCurrentStep();

    expect(nameValue).toBe("Restored User");
    expect(handleValue).toBe("restored");
    expect(bioValue).toBe("Restored bio");
    expect(currentStep).toBe("1"); // Back to Basics step
  });

  test("should clear state when localStorage is removed", async ({ page }) => {
    await wizard.goto();

    // Fill in some data
    await wizard.fillBasics("Test User", "testuser", "Test bio");
    await wizard.waitForUsernameCheck();
    await wizard.nextStep();

    // Clear storage
    await page.evaluate(() => {
      localStorage.removeItem("me3_wizard_state");
    });

    // Reload after clearing
    await page.reload();

    // Check localStorage is cleared
    const storageState = await page.evaluate(() => {
      return localStorage.getItem("me3_wizard_state");
    });

    expect(storageState).toBeNull();

    // Check we're back to step 1
    const currentStep = await wizard.getCurrentStep();
    expect(currentStep).toBe("1");

    // Check fields are cleared
    const nameValue = await page.locator("#name").inputValue();
    expect(nameValue).toBe("");
  });

  test("should persist state across multiple steps", async ({ page }) => {
    await wizard.goto();

    // Fill basics
    await wizard.fillBasics("Multi Step User", "multistep", "Bio");
    await wizard.waitForUsernameCheck();
    await wizard.nextStep();

    // Go to step 3 (Banner)
    await wizard.nextStep();

    // Reload
    await page.reload();
    await page.waitForTimeout(500);

    // Should be on step 3
    const currentStep = await wizard.getCurrentStep();
    expect(currentStep).toBe("3");

    // Go back and check basics are still there
    await wizard.prevStep();
    await wizard.prevStep();

    const nameValue = await page.locator("#name").inputValue();
    expect(nameValue).toBe("Multi Step User");
  });

  test("should handle corrupted localStorage gracefully", async ({ page }) => {
    // Set invalid JSON in localStorage before navigation
    await page.addInitScript(() => {
      localStorage.setItem("me3_wizard_state", "invalid json{");
    });

    await wizard.goto();

    // Should still load (with default state)
    await page.waitForTimeout(500);
    const currentStep = await wizard.getCurrentStep();
    expect(currentStep).toBe("1");

    // Should be able to proceed normally
    await wizard.fillBasics("New User", "newuser", "New bio");
    await wizard.waitForUsernameCheck();
    await wizard.expectCanProceed(true);
  });
});
