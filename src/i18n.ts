export type Locale = "ru" | "en";

const messages = {
  ru: {
    title: "Точки",
    subtitle: "Окружай точки соперника и захватывай область",
    red: "Красные",
    blue: "Синие",
    turn: "Ход",
    undo: "Отменить",
    newGame: "Новая игра",
    resetConfirm: "Начать новую игру? Текущая партия будет удалена.",
    hint: "Замкните соседними точками контур вокруг точки соперника."
  },
  en: {
    title: "Dots",
    subtitle: "Surround opponent dots and capture the area",
    red: "Red",
    blue: "Blue",
    turn: "Turn",
    undo: "Undo",
    newGame: "New game",
    resetConfirm: "Start a new game? The current game will be cleared.",
    hint: "Close a boundary of neighboring dots around an opponent dot."
  }
} as const;

export const resolveLocale = (languages: readonly string[] = navigator.languages): Locale =>
  languages.some((language) => language.toLowerCase().startsWith("ru")) ? "ru" : "en";

export const t = (locale: Locale) => messages[locale];
