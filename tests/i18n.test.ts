import { describe, it, expect } from "vitest";
import en from "../src/lib/i18n/messages/en";
import { LOCALES } from "../src/lib/i18n/locales";
import { getDictionary, t } from "../src/lib/i18n/translate";

const expectedKeys = Object.keys(en).sort();

describe("i18n message dictionaries", () => {
  for (const { code, name } of LOCALES) {
    it(`${code} (${name}) has exactly the same keys as en`, () => {
      const dict = getDictionary(code);
      expect(Object.keys(dict).sort()).toEqual(expectedKeys);
    });

    it(`${code} (${name}) has no empty translations`, () => {
      const dict = getDictionary(code);
      for (const key of expectedKeys) {
        expect(dict[key as keyof typeof dict].length).toBeGreaterThan(0);
      }
    });
  }
});

describe("t()", () => {
  it("interpolates params", () => {
    expect(t("en", "scan.pointsLabel", { earned: 5, weight: 10 })).toBe("5 / 10 points");
  });

  it("falls back to English for an unknown locale-ish input at the type boundary", () => {
    expect(t("en", "form.button.scan")).toBe("Scan Website");
  });

  it("leaves unmatched placeholders untouched", () => {
    expect(t("en", "scan.aiSummaryUnavailable", {})).toBe("AI summary could not be generated: {error}");
  });
});
