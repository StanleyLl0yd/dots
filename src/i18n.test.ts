import { describe, expect, it } from "vitest";
import { resolveLocale } from "./i18n";

describe("locale", () => {
  it("selects Russian if any browser locale is Russian", () => {
    expect(resolveLocale(["en-US", "ru-RU"])).toBe("ru");
  });

  it("falls back to English", () => {
    expect(resolveLocale(["de-DE", "nl-NL"])).toBe("en");
  });
});
