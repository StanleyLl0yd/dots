import { readFile, writeFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const write = (path, text) => writeFile(path, text);

const insertBefore = (text, marker, block, sentinel) => {
  if (text.includes(sentinel)) return text;
  if (!text.includes(marker)) throw new Error(`Missing marker: ${marker}`);
  return text.replace(marker, `${block.trim()}\n\n${marker}`);
};

let text = await read("README.md");
text = text.replace("source-0.8.2-16A34A", "source-0.9.0-16A34A");
text = text.replace(/Current source version: \*\*0\.8\.2\*\*[^\n]*/, "Current source version: **0.9.0** · classic advanced rules + four-level local computer play + responsive Worker-based AI turns + polished board feedback/navigation + hardened PWA/accessibility + reproducible audited toolchain");
text = text.replace(/The computer opponent is completely local and offline\.[^\n]*/, "The computer opponent is completely local and offline. It does not use a server, external API, machine-learning model, analytics, or randomness. `src/game/ai.ts` remains browser-independent; the browser now executes its potentially expensive search in a cancellable Web Worker, and every returned coordinate is still accepted only through the authoritative `playMove()` path.");
text = insertBefore(text, "## ♿ Accessibility & mobile", `### 0.9.0 interaction polish

- **Mouse hover** previews the exact snapped grid intersection on desktop without claiming legality.
- **Fit game** recenters and scales the viewport so every placed stone is visible, with bounded automatic zoom.
- The latest legal move has a subtle ring marker; rejected placements get a short point-local marker.
- Newly confirmed captures receive brief visual emphasis plus localized visible/screen-reader feedback.
- The first-run navigation hint disappears after the first legal move; **Help** remains available at any time.`, "### 0.9.0 interaction polish");
text = insertBefore(text, "## 📦 PWA & offline lifecycle", `### 0.9.0 responsive controls

Computer search runs off the UI thread. Pending Worker computation can be cancelled by Undo, New game, mode/difficulty changes, or page hiding; stale Worker generations are ignored. The mobile toolbar keeps Undo, Fit game, Help, and New game visible as compact icon actions, while New game confirmation uses an accessible in-app dialog instead of \`window.confirm()\`.`, "### 0.9.0 responsive controls");
text = text.replace("- exact Undo, confirmed New game, versioned move-log persistence, and deterministic replay restore;", "- exact Undo, accessible confirmed New game, versioned move-log persistence, and deterministic replay restore;\n- cancellable AI Web Worker orchestration with stale-response guards and authoritative `playMove()` acceptance;\n- latest-move marker, move counter, capture/invalid-placement feedback, desktop snap preview, first-run Help, Fit game, and responsive mobile action toolbar;");
text = text.replace(/Version \*\*0\.8\.2\*\* is a technical hardening release\.[^\n]*/, "Version **0.9.0** is the pre-1.0 game-UX polish release. Game rules, saved-game format, and AI search decisions are unchanged; browser AI computation is isolated from the UI thread and the principal game interactions now provide clearer visual, mobile, and assistive feedback.");
text = text.replace("| AI | deterministic bounded strategic minimax over the game core |", "| AI | deterministic bounded strategic minimax over the game core, executed in a browser Web Worker |");
if (!text.includes("ai-worker.ts")) text = text.replace("│   ├── ai.ts              pure multi-level strategic computer search", "│   ├── ai.ts              pure multi-level strategic computer search\n│   ├── ai-worker.ts       browser Worker entry for isolated AI computation\n│   ├── ai-worker-protocol.ts  typed Worker request/response contract");
text = text.replace("└── verify-build.mjs       production PWA artifact verification", "└── verify-build.mjs       production PWA/AI-worker artifact verification");
text = text.replace("post-build verification of generated PWA artifacts.", "post-build verification of generated PWA and AI Web Worker artifacts.");
text = text.replace(/## 🗺 Roadmap\n\n[\s\S]*?(?=## 📄 License)/, `## 🗺 Roadmap

1. Treat 0.9.x as the release-candidate line: perform empirical desktop/mobile browser and installed-PWA testing and fix concrete regressions only.
2. Continue adversarial topology and tactical AI validation without speculative feature expansion before 1.0.
3. Release **1.0.0** after clean real-device, persistence, offline/update, Worker-cancellation, accessibility, and long-game checks.
4. Consider import/export or Android/Capacitor packaging only after the stable 1.0 web/PWA release.

`);
await write("README.md", text);

text = await read("README_RU.md");
text = text.replace("source-0.8.2-16A34A", "source-0.9.0-16A34A");
text = text.replace(/Текущая версия исходников: \*\*0\.8\.2\*\*[^\n]*/, "Текущая версия исходников: **0.9.0** · классические расширенные правила + четыре уровня локального компьютера + отзывчивые ходы ИИ через Web Worker + улучшенная обратная связь/навигация + PWA/доступность + воспроизводимый проверяемый toolchain");
text = text.replace(/Компьютерный соперник полностью локальный и работает без сети\.[^\n]*/, "Компьютерный соперник полностью локальный и работает без сети. Он не использует сервер, внешний API, ML-модель, аналитику или случайность. `src/game/ai.ts` остаётся независимым от браузера; потенциально тяжёлый поиск теперь выполняется в отменяемом Web Worker, а полученная координата по-прежнему принимается только через авторитетный `playMove()`.");
text = insertBefore(text, "## ♿ Доступность и мобильные устройства", `### Улучшения взаимодействия в 0.9.0

- **Наведение мыши** на desktop показывает точное пересечение, к которому привяжется клик, не объявляя допустимость.
- **Показать игру** центрирует и масштабирует viewport так, чтобы были видны все поставленные точки; автоматическое увеличение ограничено.
- Последний легальный ход отмечается тонким кольцом, недопустимая постановка — коротким локальным маркером.
- Новые подтверждённые захваты получают короткое визуальное выделение и локализованное видимое/screen-reader сообщение.
- Подсказка первого запуска исчезает после первого легального хода, а **Справка** остаётся доступна всегда.`, "### Улучшения взаимодействия в 0.9.0");
text = insertBefore(text, "## 📦 PWA и офлайн", `### Отзывчивый интерфейс 0.9.0

Поиск хода компьютера выполняется вне UI-thread. Активный Worker можно безопасно отменить через Undo, новую игру, смену режима/сложности или скрытие страницы; ответы устаревшего поколения игнорируются. На мобильном Undo, «Показать игру», Справка и Новая игра остаются видимыми компактными кнопками. Подтверждение новой игры использует доступный встроенный диалог вместо \`window.confirm()\`.`, "### Отзывчивый интерфейс 0.9.0");
text = text.replace("- зафиксированный `package-lock.json` и воспроизводимая установка через `npm ci` в CI и GitHub Pages;", "- вычисление хода компьютера в отменяемом Web Worker с авторитетным принятием через `playMove()`;\n- маркер последнего хода, счётчик ходов, feedback захвата/недопустимого хода, desktop snap-preview, Fit game и компактная mobile-панель;\n- зафиксированный `package-lock.json` и воспроизводимая установка через `npm ci` в CI и GitHub Pages;");
text = text.replace(/Версия \*\*0\.8\.2\*\*[^\n]*/, "Версия **0.9.0** — UX-релиз перед 1.0. Правила, формат сохранения и решения ИИ не меняются; расчёт компьютера вынесен с UI-thread, а ключевые действия получили более понятную визуальную, мобильную и assistive-обратную связь.");
text = text.replace("| ИИ | детерминированный ограниченный стратегический minimax поверх game core |", "| ИИ | детерминированный ограниченный стратегический minimax поверх game core, выполняемый в browser Web Worker |");
if (!text.includes("ai-worker.ts")) text = text.replace("│   ├── ai.ts              чистый многоуровневый стратегический поиск компьютера", "│   ├── ai.ts              чистый многоуровневый стратегический поиск компьютера\n│   ├── ai-worker.ts       browser Worker entry для изолированного расчёта ИИ\n│   ├── ai-worker-protocol.ts  типизированный Worker protocol");
text = text.replace("└── verify-build.mjs       проверка production PWA-артефактов", "└── verify-build.mjs       проверка production PWA/AI-worker артефактов");
text = text.replace("постпроверку сгенерированных PWA-артефактов.", "постпроверку сгенерированных PWA- и AI Web Worker-артефактов.");
await write("README_RU.md", text);

text = await read("docs/PRODUCT.md");
text = text.replace(/Version \*\*0\.8\.2\*\* supports[^\n]*/, "Version **0.9.0** supports the complete classic local game, strategically refined four-level computer opponent, fixed tactical regressions, responsive Worker-isolated browser AI turns, polished board feedback/navigation, PWA/accessibility, and the reproducible audited toolchain:");
text = text.replace("- **New game** resets the board and asks for confirmation when a game is in progress.", "- **New game** resets the board and uses an accessible in-app confirmation dialog when a game is in progress.");
text = insertBefore(text, "## Game-state ergonomics", `### Browser AI orchestration in 0.9.0

The browser sends a structured-cloned \`GameState\` plus AI options to a dedicated Web Worker. Worker results are proposals only: the UI validates the request generation and coordinate, then accepts it through the same authoritative \`playMove()\` path. Undo, New game, mode/difficulty changes, page hide, and hidden-document transitions may terminate pending work; stale generations must never apply a move. AI search policy, rule evaluation, and saved-game format are unchanged.`, "### Browser AI orchestration in 0.9.0");
text = insertBefore(text, "## Browser, accessibility, and PWA behavior", `### UX feedback in 0.9.0

Latest-move rings, move counters, desktop snap previews, invalid-placement markers, capture emphasis, first-run Help, and the mobile action toolbar are presentation only. **Fit game** derives a bounded viewport from placed-stone coordinates and cannot alter rule-space coordinates or history. Capture feedback is derived from confirmed before/after active capture state; reduced-motion mode may suppress transient emphasis but not essential textual/assistive feedback.`, "### UX feedback in 0.9.0");
if (text.includes("### Phase 6 — optional refinement and Android packaging")) {
  text = text.replace("### Phase 6 — optional refinement and Android packaging", `### Phase 6 — game UX polish / release-candidate foundation — complete in 0.9.0

- cancellable browser Web Worker for computer search without changing AI decisions or core rules;
- latest-move marker and move counter;
- Fit game viewport recovery;
- capture and invalid-placement feedback plus desktop snap preview;
- compact first-run guidance with persistent Help dialog;
- compact mobile primary-action toolbar;
- accessible in-app New game confirmation;
- production verification that the AI Worker bundle is generated.

### Phase 7 — 1.0 validation and optional post-1.0 work`);
  text = text.replace("Further AI refinement must be driven by concrete failing positions or measured regressions and remain bounded. Import/export may be added only if it stays simple and useful. Package the same web codebase with Capacitor only after sufficient real-device PWA validation.", "Treat 0.9.x as a release-candidate line for empirical browser/device/PWA testing and concrete bug fixes. Further AI work must be driven by failing positions or measured regressions. Import/export and Capacitor/Android packaging remain optional post-1.0 work rather than prerequisites for the stable web release.");
}
if (!text.includes("Worker responses are proposals only.")) text = text.replace("- AI must not import or depend on Canvas, DOM, viewport, service worker, storage, or network state.", "- AI must not import or depend on Canvas, DOM, viewport, service worker, storage, or network state. Browser Worker transport may carry a structured-cloned `GameState` and options but must not become a rules authority.\n- Worker responses are proposals only. Stale/cancelled generations must be ignored, and every accepted computer coordinate must still enter through `playMove()`.");
text = text.replace("- Pan/zoom and accessibility camera-follow may change only presentation.", "- Pan/zoom, Fit game, desktop snap preview, latest-move/invalid markers, and accessibility camera-follow may change only presentation.");
text = text.replace("- Production builds must fail if required PWA/offline install artifacts are missing.", "- Production builds must fail if required PWA/offline install artifacts or the browser AI Worker bundle are missing.");
await write("docs/PRODUCT.md", text);

text = await read("docs/ARCHITECTURE.md");
if (!text.includes("ai-worker.ts")) text = text.replace("│   ├── ai.ts", "│   ├── ai.ts\n│   ├── ai-worker.ts\n│   ├── ai-worker-protocol.ts\n│   ├── ai-worker-protocol.test.ts", 1);
text = insertBefore(text, "## Viewport", `### Browser Worker and UX orchestration

Version 0.9.0 keeps \`src/game/ai.ts\` pure and runs browser AI computation through \`src/game/ai-worker.ts\`. \`src/game/ai-worker-protocol.ts\` carries a structured-cloned \`GameState\`, options, and request generation. The returned point is accepted only by \`main.ts\` through \`playMove()\`. Undo, New game, mode/difficulty changes, page hide, and hidden-document transitions terminate pending Worker work; generation guards reject stale responses.

\`CanvasBoard\` owns presentation-only latest-move, desktop snap-preview, invalid-point, and confirmed-capture emphasis. \`fitViewportToPoints()\` remains a pure viewport helper with bounded automatic zoom. Move count comes from session history, Help/New game use native accessible dialogs, and mobile primary actions stay visible as compact controls.`, "### Browser Worker and UX orchestration");
text = text.replace("`scripts/verify-build.mjs` runs after every production build and fails if the generated PWA manifest, service worker, key install/mobile assets, expected standalone metadata, or Apple touch-icon linkage is missing.", "`scripts/verify-build.mjs` runs after every production build and fails if the generated PWA manifest, service worker, key install/mobile assets, expected standalone metadata, Apple touch-icon linkage, or generated `ai-worker-*.js` Worker asset is missing.");
await write("docs/ARCHITECTURE.md", text);

text = await read("docs/AI.md");
text = insertBefore(text, "## Preference migration", `## Browser Worker isolation

Version **0.9.0** changes browser orchestration, not AI policy. \`main.ts\` starts \`src/game/ai-worker.ts\` as a dedicated Web Worker and sends a structured-cloned \`GameState\`, focus point, player, difficulty, and request generation through \`ai-worker-protocol.ts\`. Structured clone preserves the state's \`Map\`; a regression test locks down that transport assumption.

The Worker returns only the request generation and a proposed coordinate (or an error). The browser rejects stale generations and still calls \`playMove()\` before a move can enter session history or persistence. Undo, New game, mode/difficulty changes, page hide, and hidden-document transitions can terminate active Worker work. If Blue remains to move after a legitimate cancellation, foreground scheduling starts a fresh calculation.

This keeps long Hard/Expert calculations off the UI thread without changing search depth, evaluation, deterministic tie-breaking, tactical benchmarks, or game rules. Production verification requires the generated \`ai-worker-*.js\` asset.`, "## Browser Worker isolation");
text = text.replace("- A pending computer turn is suspended when the document is hidden and resumed when the app returns to the foreground.", "- Browser AI work is terminated when hidden or superseded, stale generations are ignored, and a needed Blue turn is rescheduled when the app returns to the foreground.");
await write("docs/AI.md", text);

text = await read("AGENTS.md");
if (!text.includes("Treat Worker results as cancellable proposals.")) text = text.replace("- Keep `src/game/ai.ts` free of DOM, Canvas, viewport, storage, service-worker, and network dependencies. AI behavior must remain usable offline and independently testable from the browser shell.", "- Keep `src/game/ai.ts` free of DOM, Canvas, viewport, storage, service-worker, and network dependencies. AI behavior must remain usable offline and independently testable from the browser shell.\n- Browser AI computation may run in a dedicated Web Worker, but Worker transport is orchestration only: it may carry structured-cloned rule state/options and a proposed coordinate, never parallel legality/capture/score state.\n- Treat Worker results as cancellable proposals. Ignore stale generations and validate every accepted computer coordinate through `playMove()` after it returns to the browser shell.");
text = text.replace("- Pan, zoom, keyboard camera-follow, resize, and device-pixel ratio may change only presentation. The same game coordinate must remain the same rule-space point.", "- Pan, zoom, Fit game, keyboard camera-follow, resize, and device-pixel ratio may change only presentation. The same game coordinate must remain the same rule-space point. Fit game must derive only a viewport from existing placed-stone coordinates and must not alter the move log or rules.");
if (!text.includes("Last-move markers")) text = text.replace("- Keep Canvas backing resolution bounded independently from CSS/game geometry when needed for mobile memory safety; changing the DPR cap must not change game coordinates or snapping.", "- Keep Canvas backing resolution bounded independently from CSS/game geometry when needed for mobile memory safety; changing the DPR cap must not change game coordinates or snapping.\n- Last-move markers, mouse snap previews, invalid-placement feedback, move counters, Help/first-run hints, and toolbar layout are presentation only. They must not become legality or persistence authorities.\n- Capture feedback must be derived only from confirmed before/after active capture state. Reduced-motion may suppress transient visual emphasis but not essential text/live feedback.\n- Destructive in-app dialogs must preserve keyboard/focus accessibility and must not change New game/Undo semantics.");
text = text.replace("- Preserve offline/PWA behavior and GitHub Pages compatibility. Required manifest/service-worker/install assets must continue to be verified by the production build.", "- Preserve offline/PWA behavior and GitHub Pages compatibility. Required manifest/service-worker/install assets and the generated browser AI Worker bundle must continue to be verified by the production build.");
await write("AGENTS.md", text);

const pkg = JSON.parse(await read("package.json"));
pkg.version = "0.9.0";
await write("package.json", JSON.stringify(pkg, null, 2) + "\n");
const lock = JSON.parse(await read("package-lock.json"));
lock.version = "0.9.0";
if (lock.packages?.[""]) lock.packages[""].version = "0.9.0";
await write("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
