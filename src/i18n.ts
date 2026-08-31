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
    hint: "Замыкайте соседние точки вокруг соперника. Перетаскивание — поле, колесо или щипок — масштаб."
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
    hint: "Close neighboring dots around the opponent. Drag to pan; wheel or pinch to zoom."
  }
} as const;

export const resolveLocale = (languages: readonly string[] = navigator.languages): Locale =>
  languages.some((language) => language.toLowerCase().startsWith("ru")) ? "ru" : "en";

export const t = (locale: Locale) => messages[locale];
