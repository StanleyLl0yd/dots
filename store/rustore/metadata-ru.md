# RuStore publication data

## Application

- Package: `com.sl.dots`
- Version name: `1.0.0`
- Name: `Dots`
- Type: Game
- Main category: Board games (`board`)
- Secondary category: Strategy (`strategy`)
- Age rating: `0+`
- In-game content warnings: none
- Price: Free
- Advertising: No
- In-app purchases: No
- Accounts: No

Keep the storefront name exactly `Dots`: RuStore requires the storefront and installed application names to match. Put search intent into the subtitle/descriptions rather than renaming the application.

## ASO keyword focus

Primary Russian search intent, used naturally rather than repeated mechanically:

- `точки`, `игра точки`, `классические точки`;
- `логическая игра`, `логическая стратегия`, `тактическая игра`;
- `игра офлайн`, `без интернета`;
- `игра на двоих`, `два игрока`;
- `против компьютера`, `игра с компьютером`;
- `захват территории`, `окружение точек`.

## Search tags

Use all five available RuStore game-tag slots with the most relevant discovery intent:

- `28` — Интеллектуальные игры
- `41` — Логическая игра
- `51` — Однопользовательская игра
- `52` — Офлайн
- `94` — Тактические игры

Do not use generic multiplayer tags: Dots supports two players locally on one device, not network multiplayer.

## Subtitle

Use this if the current RuStore Console exposes a subtitle field:

Классическая логическая стратегия «Точки»

## Short description

Классические «Точки»: логическая стратегия офлайн, вдвоём и против компьютера.

## Full description

Dots — классическая логическая стратегия «Точки» для Android. Ставьте точки на пересечениях сетки, окружайте соперника замкнутыми контурами, захватывайте точки и контролируйте пространство на большом игровом поле.

Играйте так, как удобно:

- вдвоём на одном устройстве;
- против компьютера без подключения к серверу;
- выбирайте один из четырёх уровней сложности — лёгкий, обычный, сложный или эксперт;
- масштабируйте и свободно перемещайте поле;
- отменяйте ходы и быстро показывайте всю текущую позицию;
- продолжайте незавершённую партию после перезапуска.

«Точки» — пошаговая тактическая игра, где важны планирование, внимание и умение строить замкнутые цепочки. Простые правила быстро осваиваются, но каждая партия создаёт новые ситуации: можно атаковать, защищать свои группы, создавать угрозы окружения и перехватывать инициативу. Захваты определяют текущий счёт, а окружённые области и ответные контуры заставляют думать на несколько ходов вперёд.

Компьютерный соперник работает полностью локально. На уровнях от лёгкого до эксперта меняется глубина и ширина поиска ходов, поэтому можно выбрать спокойную игру или более серьёзную тактическую задачу. ИИ не использует интернет, внешние сервисы или случайные подсказки: партия рассчитывается прямо на устройстве.

Dots подходит для тех, кто ищет:

- классическую игру «Точки»;
- логическую игру и тактическую стратегию;
- офлайн-игру без регистрации;
- игру на двоих на одном телефоне;
- игру против компьютера;
- настольную игру на сетке с захватом территории;
- спокойную интеллектуальную игру без рекламы и доната.

Поле можно свободно перемещать и масштабировать жестами. Кнопка показа позиции помогает быстро вернуть в кадр все поставленные точки, а отмена хода позволяет пересмотреть решение. Встроенная справка всегда доступна из игрового экрана.

В приложении нет рекламы, платных функций, аккаунтов и аналитики. Игровой процесс не требует регистрации и подключения к интернету. Сохранение партии, выбранный режим, уровень сложности, положение поля и настройка звука хранятся локально на устройстве.

Интерфейс доступен на русском языке. Есть стартовое меню, встроенная справка, отключаемые звуки ходов и захватов, управление масштабом поля и быстрый возврат к текущей позиции. Можно начать локальную партию вдвоём, выбрать игру против компьютера или продолжить сохранённую позицию.

Dots сохраняет дух классической игры на бумаге в клетку: минимум лишних элементов, понятная сетка, красные и синие точки и вся стратегия — в ваших решениях. Окружайте точки соперника, защищайте свои цепочки и находите лучший ход.

## What's new — 1.0.0

### ASO-ready text for RuStore Console

Dots 1.0.0 — стабильный выпуск классической игры «Точки»: офлайн, вдвоём на одном устройстве или против компьютера с четырьмя уровнями сложности.

Все изменения начиная с версии 0.9.3:

- **0.9.3 — подготовка RuStore и AAB.** Добавлены публикационный пакет RuStore, отдельная схема app-signing/upload key, проверка подписи AAB, манифеста и installable APK перед выпуском.
- **0.9.4 — единое игровое ядро.** Правила, захваты, счёт, восстановление партии и компьютерный соперник перенесены в общее Rust-ядро для одинакового поведения Android, macOS и веб-версии. Усилены проверки Android release-сборки, JNI-библиотек и 16 КБ выравнивания. Улучшены внутреннее кэширование ИИ, хранение данных и воспроизводимость зависимостей без изменения правил и формата сохранений.
- **0.9.5 — единая иконка Dots.** Web/PWA, Android, macOS и RuStore теперь используют один утверждённый исходник иконки.
- **0.10.0 — стартовое меню и звуки.** Добавлено меню с продолжением партии, новой игрой против компьютера или вдвоём, справкой, сведениями о приложении и переключателем звука. Появились локальные звуки ходов красных и синих, захвата, недопустимого хода и отмены; звук можно отключить.
- **1.0.0 — стабильность, ИИ и защита релиза.** Исправлена корректность кэша поиска ИИ для разных поисковых контекстов, оптимизирован обход захватов, усилены проверки зависимостей, CI, CodeQL, Semgrep, Gitleaks и RustSec, а release-артефакты жёстко привязаны к исходному коду версии.

В 1.0.0 сохранены правила классических «Точек», подсчёт очков, формат сохранений и четыре уровня сложности компьютера. Игра по-прежнему работает офлайн, без рекламы, аккаунта и обязательного подключения к интернету.

## Developer contact

At least one public developer contact is mandatory in RuStore. Enter the developer's real public contact in the console:

- Email; or
- VK group; or
- Website; or
- MAX.

Do not invent a contact. The GitHub project URL can be provided as an additional project link, but it should not replace the mandatory contact unless RuStore accepts it in the selected website field.

## URLs and legal information

- Privacy policy: `https://stanleyll0yd.github.io/dots/privacy.html`
- User agreement: `https://stanleyll0yd.github.io/dots/terms.html`
- Project: `https://github.com/StanleyLl0yd/dots`

Developer legal identity, address and tax/registration details must match the RuStore developer account and applicable legal requirements. Do not duplicate guessed values in the store text.

## User data safety

Declare the actual build as follows, provided RuStore's manifest analysis does not identify an additional data type or sensitive permission:

- Personal data collected: No
- Personal data shared with third parties: No
- Analytics: No
- Advertising/tracking: No
- Location: No
- Camera: No
- Microphone: No
- Contacts: No
- Account/authentication data: No
- Payments: No
- Game state and preferences: stored only locally on the user's device
- Network: not required for gameplay; the GitHub project page can be opened in an external browser only after an explicit user action

If RuStore lists any permission automatically after the AAB is uploaded, verify it against the generated Android manifest before submitting the declaration.

## Moderator comment

Регистрация и тестовый аккаунт не требуются. После запуска открывается стартовое меню. Для проверки режима против компьютера выберите «Против компьютера» и любой из четырёх уровней сложности. Для локальной партии выберите «Два игрока». Звук можно отключить в стартовом меню или игровой панели. Партия, режим, сложность и настройки хранятся локально на устройстве.

## Store assets and ASO order

The `RuStore Assets` GitHub Actions workflow produces real Android-emulator captures from the current Dots UI, adds restrained Russian ASO captions around the real interface, verifies the output, and packages it for the store.

Recommended RuStore order:

1. `01-game-capture.png` — **Окружайте и захватывайте** · real scoring capture state.
2. `02-vs-computer.png` — **Играйте против компьютера** · Expert mode visible in the real UI.
3. `03-start-menu.png` — **Играйте вдвоём** · real start menu with local/computer choices.
4. `04-help.png` — **Правила всегда под рукой** · real in-app Help dialog.

Other generated assets:

- `icon-512.png` — 512×512 store icon;
- `promo-banner-1080x607.png` — keyword-focused promo banner for classic «Точки», offline play and computer/local modes.

The screenshots are generated from an Android emulator and use the real Dots UI and game engine. The ASO frame must not invent controls, game states or capabilities. The harness fails if Russian localization, the expected mode/menu/dialog, or the real capture state is missing.