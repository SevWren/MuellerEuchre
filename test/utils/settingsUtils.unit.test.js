// filepath: test/utils/settingsUtils.unit.test.js

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getDefaultSettings,
  validateSettings,
  mergeSettings,
} from "../../src/utils/settingsUtils.js";

describe("settingsUtils", () => {
  describe("getDefaultSettings()", () => {
    it("should return the hardcoded default settings", () => {
      const defaultSettings = getDefaultSettings();
      assert.deepStrictEqual(defaultSettings, { winningScore: 10 });
    });

    it("should return a new object each time", () => {
      const settings1 = getDefaultSettings();
      const settings2 = getDefaultSettings();
      assert.notStrictEqual(settings1, settings2); // Ensure new object each time
    });
  });

  describe("validateSettings(customSettings)", () => {
    it("should return isValid: true for valid settings", () => {
      const result = validateSettings({ winningScore: 15 });
      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it("should return isValid: true for empty settings object", () => {
      const result = validateSettings({});
      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it("should return isValid: true for settings with only winningScore within range", () => {
      const result = validateSettings({ winningScore: 5 });
      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, []);

      const result2 = validateSettings({ winningScore: 21 });
      assert.strictEqual(result2.isValid, true);
      assert.deepStrictEqual(result2.errors, []);
    });

    it("should return isValid: false and errors for non-object customSettings (null)", () => {
      const result = validateSettings(null);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.includes("Custom settings must be an object."));
    });

    it("should return isValid: false and errors for non-object customSettings (string)", () => {
      const result = validateSettings("invalid");
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.includes("Custom settings must be an object."));
    });

    it("should return isValid: false and errors for winningScore outside valid range (too low)", () => {
      const result = validateSettings({ winningScore: 4 });
      assert.strictEqual(result.isValid, false);
      assert.ok(
        result.errors.includes("Winning score must be between 5 and 21.")
      );
    });

    it("should return isValid: false and errors for winningScore outside valid range (too high)", () => {
      const result = validateSettings({ winningScore: 22 });
      assert.strictEqual(result.isValid, false);
      assert.ok(
        result.errors.includes("Winning score must be between 5 and 21.")
      );
    });

    it("should return isValid: false and errors for non-integer winningScore (float)", () => {
      const result = validateSettings({ winningScore: 10.5 });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.includes("Winning score must be an integer."));
    });

    it("should return isValid: false and errors for non-numeric winningScore (string)", () => {
      const result = validateSettings({ winningScore: "ten" });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.includes("Winning score must be an integer."));
    });

    it("should return isValid: false and errors for winningScore as null", () => {
      const result = validateSettings({ winningScore: null });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.includes("Winning score must be an integer."));
    });

    it("should return isValid: true if winningScore is undefined (will use default)", () => {
      const result = validateSettings({ someOtherSetting: true });
      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, []);
    });
  });

  describe("mergeSettings(customSettings)", () => {
    it("should return default settings if customSettings is empty or undefined", () => {
      const defaultSettings = getDefaultSettings();
      assert.deepStrictEqual(mergeSettings(), defaultSettings);
      assert.deepStrictEqual(mergeSettings(undefined), defaultSettings);
      assert.deepStrictEqual(mergeSettings({}), defaultSettings);
    });

    it("should merge custom settings with defaults, overriding existing keys", () => {
      const custom = { winningScore: 15 };
      const merged = mergeSettings(custom);
      assert.deepStrictEqual(merged, { winningScore: 15 });
    });

    it("should add new keys from custom settings", () => {
      const custom = { newSetting: "value" };
      const merged = mergeSettings(custom);
      assert.deepStrictEqual(merged, {
        winningScore: 10,
        newSetting: "value",
      });
    });

    it("should filter out undefined values from custom settings", () => {
      const custom = { winningScore: undefined, newSetting: "value" };
      const merged = mergeSettings(custom);
      assert.deepStrictEqual(merged, {
        winningScore: 10,
        newSetting: "value",
      });
    });

    it("should handle null as customSettings by returning defaults", () => {
      const merged = mergeSettings(null);
      assert.deepStrictEqual(merged, { winningScore: 10 });
    });

    it("should handle non-object as customSettings by returning defaults", () => {
      const merged = mergeSettings("not an object");
      assert.deepStrictEqual(merged, { winningScore: 10 });
    });

    it("should return a new object, not mutate the input", () => {
      const custom = { winningScore: 12 };
      const merged = mergeSettings(custom);
      assert.notStrictEqual(merged, custom);
      assert.deepStrictEqual(custom, { winningScore: 12 }); // Ensure original is unchanged
    });

    it("should correctly merge multiple custom properties", () => {
      const custom = { winningScore: 12, theme: "dark", sound: true };
      const merged = mergeSettings(custom);
      assert.deepStrictEqual(merged, {
        winningScore: 12,
        theme: "dark",
        sound: true,
      });
    });
  });
});