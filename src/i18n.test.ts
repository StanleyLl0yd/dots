import { describe, expect, it } from "vitest";
import { resolveLocale, t } from "./i18n";

describe("locale", () => {
  it("selects Russian if any browser locale is Russian", () => {
    expect(resolveLocale(["en-US", "ru-RU"])).toBe("ru");
  });

  it("falls back to English", () => {
    expect(resolveLocale(["de-DE", "nl-NL"])).toBe("en");
  });

  it("provides localized start-menu labels", () => {
    expect(t("ru").menu).toBe("Меню");
    expect(t("ru").continueGame).toBe("Продолжить");
    expect(t("ru").exit).toBe("Выход");
    expect(t("ru").soundOn).toBe("Звук: включён");
    expect(t("ru").soundOff).toBe("Звук: выключен");
    expect(t("en").menu).toBe("Menu");
    expect(t("en").continueGame).toBe("Continue");
    expect(t("en").exit).toBe("Exit");
    expect(t("en").soundOn).toBe("Sound: on");
    expect(t("en").soundOff).toBe("Sound: off");
  });
});
