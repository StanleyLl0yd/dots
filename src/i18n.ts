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
    hint: "Замыкайте соседние точки вокруг соперника. Перетаскивание — поле, колесо или щипок — масштаб.",
    boardLabel: "Игровое поле Точек",
    boardInstructions: "Поле доступно с клавиатуры: стрелки перемещают курсор между пересечениями, Enter или Пробел ставит точку, плюс и минус меняют масштаб. Мышью или пальцем перетаскивайте поле; колесо или щипок меняют масштаб.",
    cursor: "Пересечение",
    placed: "Точка поставлена",
    unavailable: "Ход на этом пересечении недоступен",
    offline: "Нет сети — можно продолжать сохранённую локальную игру",
    online: "Соединение восстановлено",
    offlineReady: "Игра готова к работе без сети",
    updateAvailable: "Доступна новая версия",
    updateNow: "Обновить",
    pwaError: "Не удалось включить офлайн-режим"
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
    hint: "Close neighboring dots around the opponent. Drag to pan; wheel or pinch to zoom.",
    boardLabel: "Dots game board",
    boardInstructions: "The board supports keyboard play: arrow keys move the cursor between grid intersections, Enter or Space places a dot, and plus or minus changes zoom. Drag with mouse or touch to pan; use the wheel or pinch to zoom.",
    cursor: "Intersection",
    placed: "Dot placed",
    unavailable: "That intersection is unavailable",
    offline: "Offline — the saved local game remains playable",
    online: "Connection restored",
    offlineReady: "The game is ready for offline use",
    updateAvailable: "A new version is available",
    updateNow: "Update",
    pwaError: "Offline mode could not be enabled"
  }
} as const;

export const resolveLocale = (languages: readonly string[] = navigator.languages): Locale =>
  languages.some((language) => language.toLowerCase().startsWith("ru")) ? "ru" : "en";

export const t = (locale: Locale) => messages[locale];
