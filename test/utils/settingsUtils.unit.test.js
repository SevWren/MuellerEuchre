// filepath: test/utils/settingsUtils.unit.test.js

import { expect } from "chai";
import {
  getDefaultSettings,
  validateSettings,
  mergeSettings,
} from "../../src/utils/settingsUtils.js";

describe("settingsUtils", () => {
  describe("getDefaultSettings()", () => {
    it("should return the hardcoded default settings", () => {
      const defaultSettings = getDefaultSettings();
      expect(defaultSettings).to.deep.equal({ winningScore: 10 });
    });

    it("should return an immutable object", () => {
      const settings1 = getDefaultSettings();
      const settings2 = getDefaultSettings();
      expect(settings1).to.not.equal(settings2); // Ensure new object each time
    });
  });

  describe("validateSettings(customSettings)", () => {
    it("should return isValid: true for valid settings", () => {
      const result = validateSettings({ winningScore: 15 });
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it("should return isValid: true for empty settings object", () => {
      const result = validateSettings({});
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it("should return isValid: true for settings with only winningScore within range", () => {
      const result = validateSettings({ winningScore: 5 });
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;

      const result2 = validateSettings({ winningScore: 21 });
      expect(result2.isValid).to.be.true;
      expect(result2.errors).to.be.empty;
    });

    it("should return isValid: false and errors for non-object customSettings (null)", () => {
      const result = validateSettings(null);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Custom settings must be an object.");
    });

    it("should return isValid: false and errors for non-object customSettings (string)", () => {
      const result = validateSettings("invalid");
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Custom settings must be an object.");
    });

    it("should return isValid: false and errors for winningScore outside valid range (too low)", () => {
      const result = validateSettings({ winningScore: 4 });
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include(
        "Winning score must be between 5 and 21."
      );
    });

    it("should return isValid: false and errors for winningScore outside valid range (too high)", () => {
      const result = validateSettings({ winningScore: 22 });
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include(
        "Winning score must be between 5 and 21."
      );
    });

    it("should return isValid: false and errors for non-integer winningScore (float)", () => {
      const result = validateSettings({ winningScore: 10.5 });
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Winning score must be an integer.");
    });

    it("should return isValid: false and errors for non-numeric winningScore (string)", () => {
      const result = validateSettings({ winningScore: "ten" });
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Winning score must be an integer.");
    });

    it("should return isValid: false and errors for winningScore as null", () => {
      const result = validateSettings({ winningScore: null });
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Winning score must be an integer.");
    });

    it("should return isValid: true if winningScore is undefined (will use default)", () => {
      const result = validateSettings({ someOtherSetting: true });
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });
  });

  describe("mergeSettings(customSettings)", () => {
    it("should return default settings if customSettings is empty or undefined", () => {
      const defaultSettings = getDefaultSettings();
      expect(mergeSettings()).to.deep.equal(defaultSettings);
      expect(mergeSettings(undefined)).to.deep.equal(defaultSettings);
      expect(mergeSettings({})).to.deep.equal(defaultSettings);
    });

    it("should merge custom settings with defaults, overriding existing keys", () => {
      const custom = { winningScore: 15 };
      const merged = mergeSettings(custom);
      expect(merged).to.deep.equal({ winningScore: 15 });
    });

    it("should add new keys from custom settings", () => {
      const custom = { newSetting: "value" };
      const merged = mergeSettings(custom);
      expect(merged).to.deep.equal({ winningScore: 10, newSetting: "value" });
    });

    it("should filter out undefined values from custom settings", () => {
      const custom = { winningScore: undefined, newSetting: "value" };
      const merged = mergeSettings(custom);
      expect(merged).to.deep.equal({ winningScore: 10, newSetting: "value" });
    });

    it("should handle null as customSettings by returning defaults", () => {
      const merged = mergeSettings(null);
      expect(merged).to.deep.equal({ winningScore: 10 });
    });

    it("should handle non-object as customSettings by returning defaults", () => {
      const merged = mergeSettings("not an object");
      expect(merged).to.deep.equal({ winningScore: 10 });
    });

    it("should return a new object, not mutate the input", () => {
      const custom = { winningScore: 12 };
      const merged = mergeSettings(custom);
      expect(merged).to.not.equal(custom);
      expect(custom).to.deep.equal({ winningScore: 12 }); // Ensure original is unchanged
    });

    it("should correctly merge multiple custom properties", () => {
      const custom = { winningScore: 12, theme: "dark", sound: true };
      const merged = mergeSettings(custom);
      expect(merged).to.deep.equal({
        winningScore: 12,
        theme: "dark",
        sound: true,
      });
    });
  });
});
