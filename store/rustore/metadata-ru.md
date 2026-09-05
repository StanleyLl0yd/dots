# RuStore publication data

## Application

- Package: `com.sl.dots`
- Version name: `0.10.0`
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

## Search tags

Use up to five RuStore game tags:

- `28` — Интеллектуальные игры
- `41` — Логическая игра
- `51` — Однопользовательская игра
- `52` — Офлайн
- `83` — Соревновательная

## Short description

Классические «Точки»: окружайте соперника и захватывайте территорию.

## Full description

Dots — цифровая версия классической игры «Точки» на бесконечном поле.

Ставьте точки на пересечениях сетки, окружайте точки соперника замкнутыми контурами и набирайте очки за захваты. Простые правила сочетаются с тактической игрой, где важны планирование, контроль пространства и выбор каждого следующего хода.

В Dots доступны:

- игра для двух игроков на одном устройстве;
- игра против компьютера;
- четыре уровня сложности: лёгкий, обычный, сложный и эксперт;
- масштабирование и свободное перемещение по игровому полю;
- отмена ходов и быстрый показ всей текущей позиции;
- стартовое меню, встроенная справка и русскоязычный интерфейс;
- отключаемые звуки ходов, захватов и игровых действий;
- автоматическое локальное сохранение незавершённой партии и настроек.

Компьютерный соперник работает локально. Для игрового процесса не требуются регистрация или подключение к серверу. В приложении нет рекламы, аналитики, аккаунтов и платных функций.

## What's new — 0.10.0

Добавлено стартовое меню в стиле Dots и отключаемое звуковое сопровождение: разные короткие сигналы ходов красных и синих, отдельный акцент захвата, обратная связь для недопустимого хода и отмены. Настройка звука хранится локально.

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

Регистрация и тестовый аккаунт не требуются. После запуска открывается стартовое меню. Для проверки режима против компьютера выберите «Против компьютера» и любой из четырёх уровней сложности. Звук можно отключить в стартовом меню или игровой панели. Сохранения и настройки хранятся локально на устройстве.

## Store assets

The `RuStore Assets` GitHub Actions workflow produces real Android-emulator captures from the current Dots UI and verifies them before packaging:

- `icon-512.png` — 512×512 store icon;
- `promo-banner-1080x607.png` — optional promotional asset;
- `01-game-capture.png` — real local-game capture state;
- `02-vs-computer.png` — real computer-opponent mode;
- `03-help.png` — real Help dialog;
- `04-about.png` — real About dialog.

The screenshots are generated from an Android emulator, use the Dots game engine for game state, and are captured with `adb screencap`. The screenshot harness must fail if Russian localization, the intended game mode, the Help/About dialog state, or the expected real capture is not present.
