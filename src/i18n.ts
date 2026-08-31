export type Locale = "ru" | "en";

const messages = {
  ru: {
    title: "Точки",
    subtitle: "Окружай точки соперника и захватывай область",
    red: "Красные",
    blue: "Синие",
    turn: "Ход",
    newGame: "Новая игра",
    scaffold: "Стартовый каркас проекта. Механика окружений будет реализована отдельным игровым модулем."
  },
  en: {
    title: "Dots",
    subtitle: "Surround opponent dots and capture the area",
    red: "Red",
    blue: "Blue",
    turn: "Turn",
    newGame: "New game",
    scaffold: "Initial project scaffold. Capture mechanics will live in a dedicated game module."
  }
} as const;

export const resolveLocale = (languages: readonly string[] = navigator.languages): Locale =>
  languages.some((language) => language.toLowerCase().startsWith("ru")) ? "ru" : "en";

export const t = (locale: Locale) => messages[locale];
