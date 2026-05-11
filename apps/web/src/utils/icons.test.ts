import { describe, it, expect } from "vitest";
import {
  UI_ICONS,
  UI_ICON_NAMES,
  UI_ICON_META,
  isUiIconName,
  resolveUiIconName,
  getIconSvgString,
  type UiIconName,
} from "./icons";

describe("icons utilities", () => {
  describe("UI_ICON_NAMES", () => {
    it("should contain all icon names as an array", () => {
      expect(UI_ICON_NAMES).toBeInstanceOf(Array);
      expect(UI_ICON_NAMES.length).toBe(Object.keys(UI_ICONS).length);

      // Verify all icons are in the array
      Object.keys(UI_ICONS).forEach((iconName) => {
        expect(UI_ICON_NAMES).toContain(iconName);
      });
    });
  });

  describe("isUiIconName", () => {
    it("should return true for valid icon names", () => {
      expect(isUiIconName("calendar")).toBe(true);
      expect(isUiIconName("Mail")).toBe(true);
      expect(isUiIconName("shopping-cart")).toBe(true);
      // Legacy aliases
      expect(isUiIconName("cart")).toBe(true);
      expect(isUiIconName("helpCircle")).toBe(true);
      expect(isUiIconName("dice")).toBe(true);
    });

    it("should return false for invalid icon names", () => {
      expect(isUiIconName("invalid")).toBe(false);
      expect(isUiIconName("")).toBe(false);
      // Lucide includes Facebook; lowercase "facebook" resolves via toPascalCase
      expect(isUiIconName("not-a-real-lucide-icon-zzz")).toBe(false);
    });

    it("should be case sensitive", () => {
      expect(isUiIconName("Calendar")).toBe(true);
      expect(isUiIconName("CALENDAR")).toBe(false);
      expect(isUiIconName("calendar")).toBe(true);
    });

    it("should work as a type guard", () => {
      const value = "Calendar";
      if (isUiIconName(value)) {
        // TypeScript should know this is a UiIconName
        const iconName: UiIconName = value;
        expect(iconName).toBe("Calendar");
      }
    });
  });

  describe("resolveUiIconName", () => {
    it("should map legacy aliases to lucide names", () => {
      expect(resolveUiIconName("cart")).toBe("ShoppingCart");
      expect(resolveUiIconName("helpCircle")).toBe("HelpCircle");
      expect(resolveUiIconName("dice")).toBe("Dices");
    });
  });

  describe("UI_ICON_META", () => {
    it("should have metadata for known icons", () => {
      const meta = UI_ICON_META.Calendar;
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.keywords.length).toBeGreaterThan(0);
    });

    it("should have meaningful labels", () => {
      expect(UI_ICON_META.Calendar.label).toBe("Calendar");
    });

    it("should have relevant keywords for searching", () => {
      expect(UI_ICON_META.Calendar.keywords).toContain("calendar");
    });
  });

  describe("getIconSvgString", () => {
    it("should generate valid SVG string for icon", () => {
      const svg = getIconSvgString("Calendar", 24);

      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toContain('width="24"');
      expect(svg).toContain('height="24"');
    });

    it("should use custom size when provided", () => {
      const svg16 = getIconSvgString("Check", 16);
      const svg32 = getIconSvgString("Check", 32);

      expect(svg16).toContain('width="16"');
      expect(svg16).toContain('height="16"');
      expect(svg32).toContain('width="32"');
      expect(svg32).toContain('height="32"');
    });

    it("should return empty string for non-existent icon", () => {
      // TypeScript won't allow this, but testing runtime behavior
      const svg = getIconSvgString("nonexistent" as UiIconName, 24);
      expect(svg).toBe("");
    });

    it("should support legacy icon names", () => {
      const svg = getIconSvgString("cart", 24);
      expect(svg).toContain("<svg");
    });
  });
});
