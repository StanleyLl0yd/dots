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

- **0.9.3 — RuStore и Android App Bundle.** Подготовлены карточка RuStore, политика конфиденциальности, пользовательское соглашение, иконка, промобаннер и четыре скриншота. Android-релиз переведён с APK на подписанный AAB; добавлены отдельный upload key при сохранении app-signing key офлайн, проверка подписи, манифеста и сборка проверочного universal APK. macOS продолжает выпускаться как universal DMG. Игровые правила, сохранения, ИИ и веб-версия не менялись.
- **0.9.4 — единое игровое ядро и усиленная Android-сборка.** Правила ходов, дома и захваты, освобождение точек, счёт, восстановление партии и детерминированный компьютерный соперник перенесены в единое Rust-ядро. Web/PWA использует его через оптимизированный WASM, нативное приложение — напрямую через четыре IPC-команды. Удалена дублирующая TypeScript-реализация правил и ИИ; тесты топологии, тактики и сравнительной силы ИИ перенесены в Rust, а сохранения проверяются через реальное WASM-ядро. Добавлены постоянный Rust CI, контроль границы исходников, Dependabot и жёсткая проверка release-артефактов. Android-сборка стала non-debuggable, получила minify/resource shrinking, проверки JNI-библиотек, debug-секций, экспортируемых символов и 16 КБ ELF alignment; macOS проверяет обе архитектуры и отсутствие лишних символов. Оптимизированы внутреннее кэширование ИИ и хранение JSON без изменения поисковой политики, весов, порядка ходов, правил или формата сохранений. Зафиксирован Cargo.lock, автоматизация использует --locked, а Native Release стал единственным путём выпуска Android AAB. Документация и security-процессы синхронизированы.
- **0.9.5 — единая иконка Dots.** Добавлен один утверждённый raster master и детерминированная генерация иконок для Web/PWA, Tauri, Android и RuStore. Удалены старые отдельные SVG/store-icon пути; закреплены правила, запрещающие случайное трассирование, обрезку, padding, перекраску или повторное сжатие исходной графики. Игровое поведение не менялось.
- **0.10.0 — стартовое меню и локальные звуки.** Появилось локализованное меню с «Продолжить», новой игрой против компьютера или вдвоём, справкой, сведениями о приложении, выходом в native-версии и переключателем звука. В игровую панель добавлены компактные «Меню» и «Звук». Добавлены синтезируемые на устройстве сигналы ходов красных/синих, захвата, недопустимого хода и отмены — без аудиофайлов и сети. Настройки переведены на v3 с автоматической миграцией старых форматов; звук включён по умолчанию. Пока меню открыто, поле не принимает ходы, компьютерный ход ставится на паузу, а аудио активируется только после действия пользователя. Правила, счёт, сохранения и политика ИИ не менялись.
- **1.0.0 — стабильный релиз, корректность ИИ и защита выпуска.** Исправлен ключ transposition cache: теперь поисковый контекст, focus и extensions не могут ошибочно переиспользовать оценку другой ветки. Оптимизирован обход захватов за счёт типизированных идентификаторов рёбер и убрана лишняя отмена компьютерного расчёта при старте новой игры — без изменения правил и стратегии ИИ. Усилена вся цепочка поставки: npm 11+, точные direct-зависимости, registry-only SHA-512 lockfile, явная политика install scripts, запрет необязательного fsevents-скрипта, Cargo/RustSec audits, Clippy warnings-as-errors и target-aware контроль GTK/glib/proc-macro исключений. Эти проверки работают в CI, repository audit, Pages, GitHub Release, native release и RuStore assets. Добавлены CodeQL, Semgrep, Gitleaks, Dependency Review, Dependabot, SHA-pinned Actions/containers и checkout без сохранения credentials. Android/RuStore tooling использует зафиксированный NDK, локальный Tauri CLI и канонические npm/Tauri-команды. Версии npm/Rust/Tauri и lockfiles проверяются вместе. Native и RuStore release provenance привязаны к точному SHA тега, исторические rebuild доступны только через защищённый путь, а release-артефакты не могут быть незаметно заменены сборкой из другого commit.

В 1.0.0 сохранены классические правила «Точек», подсчёт очков, формат сохранений и четыре уровня сложности компьютера. Игра работает офлайн, без рекламы, аккаунта, аналитики и обязательного подключения к интернету.

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

Recommended RuStore order (the last two filenames are retained for workflow compatibility):

1. `01-game-capture.png` — **Окружайте и захватывайте** · real scoring capture state.
2. `02-vs-computer.png` — **Играйте против компьютера** · Expert mode visible in the real UI.
3. `03-help.png` — **Играйте вдвоём** · real start menu with local/computer choices.
4. `04-about.png` — **Правила всегда под рукой** · real in-app Help dialog.

Other generated assets:

- `icon-512.png` — 512×512 store icon;
- `promo-banner-1080x607.png` — branded promo banner for the classic «Точки» identity.

The screenshots are generated from an Android emulator and use the real Dots UI and game engine. The ASO frame must not invent controls, game states or capabilities. The harness fails if Russian localization, the expected mode/menu/dialog, or the real capture state is missing.