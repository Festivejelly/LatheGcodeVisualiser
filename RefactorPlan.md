# Refactor Plan: Component-Based Restructure of LatheGcodeVisualiser

## Context

The app has grown from a small tool into a fairly full-featured G-code sender (simulation viewer, jog controls, 8 quick-task wizards, a drag-and-drop job planner, serial communication with pause/resume/feed-hold) but the code hasn't grown *with* it structurally. Today it's a single 1620-line `index.html` with all markup inline, one 1634-line global `style.css`, and a flat `src/` of 8 TypeScript files (~7,800 lines) — two of which (`planner.ts` at 2309 lines and `quickTasks.ts` at 1830 lines) are almost entirely imperative `document.getElementById(...)` wiring with no internal boundaries.

Goals for this refactor:
1. Break the monolith into components (JS/TS structure, matching CSS) without adopting a heavy SPA framework, since this is fundamentally a lightweight single-page tool.
2. Preserve all existing functionality — this is a restructure, not a behavior rewrite.
3. Make the codebase approachable enough to promote on GitHub and invite outside contributors — the current structure actively discourages that.
4. Keep a future (not-yet-started) Electron desktop port in mind, so today's choices shouldn't create unnecessary friction for that later move.
5. Explicitly defer `BufferPlan.md` (a separate firmware ring-buffer design) until after this restructure — it is out of scope here.

**Decisions locked in:**
- **Component approach: [Lit](https://lit.dev)** (~5KB Web Components runtime). Chosen because custom elements are standard DOM elements — they carry over unchanged into a future Electron renderer, and Lit drops directly into the existing Vite + TypeScript toolchain with no build reconfiguration.
- **CSS scoping: global cascade, split into per-component files** (not Shadow DOM). The app leans on third-party libraries that assume global style scope — Ace editor, dragula (drag-and-drop), Font Awesome and Material Symbols icon fonts (all loaded via CDN `<link>`s) — and fighting Shadow DOM isolation for those would add friction for no real benefit at this app's size.
- **Rollout scope: convert everything** in this refactor branch, not an incremental strangler-fig — so the codebase is consistently structured for contributors from day one.

---

## Proposed `src/` structure

Organized by **role** (core logic vs. services vs. UI), not by tab, so framework-agnostic domain logic stays clearly separated from Lit components — this is also what keeps a future Electron port low-friction, since `core/` would need zero changes to run in a different shell.

```
src/
  core/                            # no Lit, no framework coupling — pure TS classes
    gcode/
      gcode.ts                     # GCode class (from src/gcode.ts)
      gcode.types.ts
    canvas/
      canvas-drawer.ts             # CanvasDrawer class (from src/canvas-drawer.ts)
    threading/
      threading.ts                 # Threading class (from src/threading.ts, already self-contained)
    example-gcode.ts               # sample text constant (from src/example.ts)

  services/                        # singletons, one per file, StorageService-shaped
    storage/
      storage.service.ts           # StorageService interface + LocalStorageService + DatabaseService + factory (from src/storage.ts, unchanged)
    serial/
      serial-connection.ts         # NEW: SerialConnection interface
      web-serial-connection.ts     # NEW: WebSerialConnection implementation (wraps navigator.serial)
    sender/
      sender.ts                    # Sender + SenderStatus + SenderClient enum (from src/sender.ts), now depends on SerialConnection
    editor/
      ace-editor.service.ts        # NEW: owns the 3 Ace instances, replaces main.ts's exported editor singletons
    app-state.ts                   # NEW, small — only if something doesn't already fit Sender/component-local state (see below)

  components/                      # Lit components, co-located with their CSS
    shell/
      app-tabs.component.(ts|css)          # tab bar + switching (replaces manual style.display toggling in main.ts)
      connection-bar.component.(ts|css)
      dro-panel.component.(ts|css)
      console-panel.component.(ts|css)
    simulation/
      simulation-tab.component.(ts|css)
      gcode-canvas.component.(ts|css)      # wraps CanvasDrawer
    control/
      control-tab.component.(ts|css)
      jog-pad.component.(ts|css)
      gcode-sender-panel.component.(ts|css)
    quick-tasks/
      quick-tasks-tab.component.(ts|css)
      quick-task-modal-base.component.(ts|css)   # shared wizard chrome, extended by the 8 below
      facing-modal.component.ts
      profiling-modal.component.ts
      drilling-modal.component.ts
      boring-modal.component.ts
      grooving-modal.component.ts
      cone-modal.component.ts
      threading-modal.component.ts
      tool-offsets-modal.component.ts
    planner/
      planner-tab.component.(ts|css)
      task-list.component.(ts|css)          # one reusable component for all 3 dragula lists
      job-select.component.(ts|css)
      task-color-picker.component.(ts|css)
    help/
      help-tab.component.(ts|css)
      help-modal.component.(ts|css)
    zoom/
      zoom-modal.component.(ts|css)
    common/
      light-dom-element.ts          # LightDomLitElement base (createRenderRoot override — see CSS section)
      base-modal.component.(ts|css) # generic open/close/backdrop, parent of quick-task-modal-base

  styles/
    tokens.css      # CSS custom properties: colors (--color-accent: #6c5ce7, etc.), spacing, radii
    reset.css        # global resets currently scattered at the top of style.css
    layout.css        # cross-tab structural rules (.main-container etc.)
    buttons.css        # shared .grid-btn base for jog/tool/zero/motor button sizing (currently duplicated 4x)
    global.css          # barrel importing the four above; imported once from main.ts

  main.ts             # bootstrap only: import global.css, mount, no business logic
  serial.d.ts         # kept as-is (Web Serial ambient types, still needed by WebSerialConnection)
  declarastions.d.ts  # kept as-is
```

Everything under `core/` and `services/` is a mechanical **move**, not a rewrite — `GCode`, `CanvasDrawer`, `Threading`, and `storage.ts`'s `StorageService`/`LocalStorageService`/`DatabaseService`/`createStorageService()` are already reasonably self-contained classes and relocate with import-path updates only. `storage.ts` in particular is the cleanest existing abstraction in the codebase and is the template this plan follows for the new `SerialConnection` service.

---

## Decomposing `index.html`

**Keep `index.html` declaring top-level custom elements directly — no `<app-root>` JS-only shell.** An `<app-root>` would hide the app's structure from view-source and gain nothing, since Vite + `vite-plugin-singlefile` already bundles everything into one file regardless. `index.html` shrinks from 1620 lines of nested `<div>`s to a short, legible manifest, e.g.:

```html
<lathe-connection-bar></lathe-connection-bar>
<lathe-dro-panel></lathe-dro-panel>
<lathe-app-tabs>
  <lathe-simulation-tab slot="simulation"></lathe-simulation-tab>
  <lathe-quick-tasks-tab slot="quick-tasks"></lathe-quick-tasks-tab>
  <lathe-planner-tab slot="planner"></lathe-planner-tab>
  <lathe-control-tab slot="control"></lathe-control-tab>
  <lathe-help-tab slot="help"></lathe-help-tab>
</lathe-app-tabs>
<lathe-console-panel></lathe-console-panel>
<lathe-zoom-modal></lathe-zoom-modal>
<lathe-help-modal></lathe-help-modal>
<lathe-quick-task-facing-modal></lathe-quick-task-facing-modal>
<!-- ...7 more quick-task modals -->
<script type="module" src="/src/main.ts"></script>
```

- `<lathe-app-tabs>` owns the tab-switching state that today is 5 blocks of manual `style.display` toggling in `main.ts` (confirmed at `index.html:18-22`, `<li id="simulationTab">…</li>` etc.) — it becomes one component managing an `activeTab` property and toggling visibility of its light-DOM children.
- **Quick-task modals**: confirmed via `src/quickTasks.ts:8` — all 8 already share one `quickTaskConfig` object shape (`{ modal, openButton, closeButton, executeButton, stopButton, progressBar, taskFunction }`). This maps directly onto a `QuickTaskModalBase` Lit class providing open/close/backdrop/progress-bar chrome, extended by 8 small subclasses that each implement G-code generation for their task. `zoom-modal` and `help-modal` extend a lighter `BaseModal` (no wizard-form concept) — hierarchy: `BaseModal` → `QuickTaskModalBase` → `FacingModal` etc.
- **Planner's 3 drag-and-drop lists** (`availableTasks` → `tasksToExecute` → `deleteTasks`) become 3 instances of one `<lathe-task-list>` component parameterized by a `list-role` property, with dragula registration (which needs real light-DOM nodes across all 3 containers as one linked group) done once in `planner-tab.component.ts`.

---

## Resolving the current coupling smells

**`main.ts`'s exported singletons, re-imported by `sender.ts`.** Today `main.ts` exports `editor`, `gcodeResponseEditor`, `gcodeSenderEditor`, `gCode`, and `sender.ts` imports `gcodeResponseEditor` back from it — a circular-shaped dependency. Fix: `services/editor/ace-editor.service.ts` owns creation of the 3 Ace instances (mirroring the `storage` singleton pattern); `sender.ts` depends only on this service, never on a UI module. The parsed-G-code value (`gCode`) moves to being owned by `simulation-tab.component.ts` as component state; anything else that needs it (planner, quick-tasks) gets it via a `gcode-updated` `CustomEvent`, not a shared exported `let`.

**`Sender` / `SenderClient` arbitration** (confirmed in `src/sender.ts`: `SenderClient` enum, `Sender.getInstance()`, `setActiveClient()`, `addStatusChangeListener()`, and per-call `client: SenderClient` parameters on `start()`/`sendCommand()`/`sendCommands()`/`getToolOffsets()`) — this is a legitimate, working cross-panel serial-line-ownership lock. Keep it unchanged in behavior; relocate to `services/sender/sender.ts` with its `SerialConnection` dependency injected instead of calling `navigator.serial` inline. Components (gcode-sender-panel, planner-tab, quick-task modals) become the callers, same call pattern as today.

**Central state — no store.** The app is small enough (5 tabs, no routing, no deep prop-drilling) that a Redux-style store would fight Lit's grain for no real benefit. Recommendation: Lit properties flow down, `CustomEvent`s flow up, and the few truly global values (connection status, DRO values, active job) stay exposed via the existing `Sender.addStatusChangeListener` pattern, now called from component lifecycle hooks (`connectedCallback`/`disconnectedCallback`) instead of top-level `DOMContentLoaded` registration. Only add `services/app-state.ts` if something genuinely doesn't fit this (e.g. "which tab is active" if consumed outside `app-tabs` itself) — expect it to stay small or be unnecessary; don't build it speculatively.

---

## CSS reorganization

Split the 1634-line `style.css` into `src/styles/` (global tokens/reset/layout/buttons) plus one `*.component.css` per component, each imported directly from its `*.component.ts` file (Vite resolves these at build time; this also gives natural dev-server HMR and keeps a component's styles visible right next to its logic for a contributor opening the file).

- **`tokens.css`**: CSS custom properties for the currently-hardcoded palette — `--color-accent: #6c5ce7` (replaces ~15+ literal repeats) plus background/border/text colors. Resolve the dead `var(--background-color, #fff)` reference (currently points at an undefined variable) by defining it properly or removing it.
- **`buttons.css`**: one shared `.grid-btn` base class capturing the sizing pattern currently duplicated across `.jog-btn` / `.tool-btn` / `.zero-btn` / `.motor-btn`, with each specific class overriding only color/icon.
- **`quick-task-modal-base.component.css`**: collapses the near-identical per-task-mode button blocks currently duplicated ~4x (`style.css` lines ~1305–1406) into one shared file, since all 8 quick-task modals extend the same base component.
- **`#gcodeSenderContainer`** is currently defined twice (lines ~372 and ~911, second silently wins) — merge into one ruleset in `gcode-sender-panel.component.css`, cross-checking the first block for any properties uniquely needed.
- Because every component renders to **light DOM** (a `LightDomLitElement` base overriding `createRenderRoot()` to return `this`), there's no `:host`/`::part()`/custom-property-piercing needed anywhere — plain global cascade throughout, consistent with how Ace/dragula/icon-font CSS already work.

---

## `SerialConnection` abstraction (Electron-readiness, no Electron work now)

New `services/serial/serial-connection.ts`, shaped like `StorageService`:

```ts
export interface SerialConnection {
  isSupported(): boolean;
  requestPort(): Promise<void>;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  isOpen(): boolean;
  write(data: string | Uint8Array): Promise<void>;
  // + whatever read/reader shape matches Sender's current usage in src/sender.ts
  addDisconnectListener(cb: () => void): void;
}
```

`WebSerialConnection` is the only implementation needed today — it's the current `navigator.serial` logic from `sender.ts`, moved verbatim, not rewritten. `Sender` takes a `SerialConnection` via constructor/`getInstance(connection?)` instead of calling `navigator.serial` directly. This is what makes a later Electron `node-serialport`-backed implementation a drop-in swap (via a preload IPC bridge) without touching `Sender` or any component — done with zero Electron-specific code today, exactly matching the "don't make the later move harder" goal.

---

## Migration order (single branch, kept runnable at each stage)

1. **Foundations** — add `lit` dependency; `tsconfig.json` changes (below); extract `src/styles/` from `style.css` (loaded alongside the old file temporarily, no conflict); add `LightDomLitElement` base.
2. **Core + services extraction** (pure TS moves, no components yet) — `gcode.ts`/`canvas-drawer.ts`/`threading.ts` → `core/`; `storage.ts` → `services/storage/`; build `SerialConnection`/`WebSerialConnection`, refactor `sender.ts` to depend on it, move to `services/sender/`; build `ace-editor.service.ts`, resolving the `sender.ts → main.ts` back-import. App still builds and behaves identically at this checkpoint — only import paths changed.
3. **Self-contained leaf components** — `zoom-modal`, `help-modal`/`help-tab`, `jog-pad`. Lowest risk; validates the `BaseModal`/`LightDomLitElement` pattern before replicating it 8x.
4. **Quick-task modals** — build `QuickTaskModalBase`, then port all 8 wizards one at a time from `quickTasks.ts`, deleting that file once complete.
5. **Simulation + Control tabs** — `simulation-tab`/`gcode-canvas` (owns `gCode`/editor), `control-tab`/`gcode-sender-panel` (wires to `Sender`), `connection-bar`/`dro-panel`/`console-panel`.
6. **Planner tab (largest, last)** — `task-list` (tested standalone with dummy data first), `job-select`, `task-color-picker`, then `planner-tab` tying them together, porting job/group/project CRUD from `planner.ts`; delete that file once complete.
7. **Shell + cleanup** — `app-tabs` replaces manual tab-switching in `main.ts`; shrink `index.html` to the top-level element manifest; shrink `main.ts` to bootstrap-only; retire old `style.css` once every rule has a new home; final dedup pass (`.grid-btn`, merged `#gcodeSenderContainer`, dead `--background-color`).

This order front-loads shared dependencies (styles, services, base classes), proves the component pattern on low-risk leaves, and leaves the two largest/most tangled files (`planner.ts`, `quickTasks.ts`) and the glue (`main.ts`, `index.html`) for once nothing else depends on their current shape.

---

## Conventions

- **Co-location**: `feature-name.component.ts` + `feature-name.component.css` in the same feature folder under `components/<feature>/` — the standard Lit convention, and the most discoverable layout for outside contributors (open one folder, see everything about "planner").
- **Tag naming**: `lathe-` prefix on all custom elements (`<lathe-task-list>`, `<lathe-connection-bar>`) — required by the custom-elements spec (hyphen in tag name), avoids collisions, reads clearly in devtools.
- **File suffixes**: `.component.ts` for Lit elements, `.service.ts` for singleton services, plain `.ts` for `core/` domain classes.
- **Types**: per-module `*.types.ts` colocated with the module that owns the concept, rather than one growing `core/types.ts`. A small `core/shared.types.ts` only for types genuinely used across 3+ unrelated modules (e.g. a shared `Point { x, z }`).
- **Decorators**: use Lit's decorator syntax (`@customElement`, `@property`, `@state`) — the dominant style in Lit's own docs, most concise across ~25+ components.

---

## Build config changes

- **`vite-plugin-singlefile`**: keep as-is — it inlines whatever Vite's bundler produces after resolving all component/CSS imports, so splitting into many small files creates no friction. No config change needed.
- **`tsconfig.json`** (currently `target: ES2020`, `module: ESNext`, `strict: true`, no decorator support): add `"experimentalDecorators": true`, and change `"useDefineForClassFields"` to `false` — Lit's `@property()` decorator relies on legacy field semantics and is known to break silently under `useDefineForClassFields: true`. No other current code relies on that setting, so this is safe.
- **`package.json`**: add `lit` to `dependencies`.

---

## Verification approach

No tests currently exist (`vitest` is installed but unused). Given this app is fundamentally visual/hardware-interactive:

- **Manual regression checklist**, run at the end of each migration stage above (not just once at the end), covering: G-code load/paste/simulate/zoom/save (Simulation tab); connect/disconnect, jog buttons, send G-code, pause/resume/feed-hold behavior (`m0Waiting`/`canResume`/`shouldShowResume` in `sender.ts`), console auto-scroll (Control tab); each of the 8 wizards' validation and generated output (Quick Tasks); job/group/project CRUD, drag-and-drop across all 3 lists, task colour assignment, import/export, "Execute Job" (Planner); tab-switching itself (easy to silently break during the `app-tabs` extraction, since it's currently just `style.display` logic).
- **G-code output diffing**: before starting the migration, capture the exact G-code string each quick-task wizard generates for a fixed set of inputs on current `main`; re-run the same inputs post-migration and diff. Cheap, deterministic, catches subtle generation regressions manual inspection might miss.
- **New unit tests where cheap**: once `core/` (gcode parsing, canvas geometry, threading math) is Lit-free and isolated (end of Stage 2), add a handful of `vitest` tests — e.g. `GCode` parsing assertions against `example-gcode.ts`, `Threading` pitch/depth-pass math against known values. Low-effort side benefit of the refactor, not new scope.
- Serial/hardware interaction can't be meaningfully unit tested without a real controller — run the manual checklist against real hardware as the final gate before merging.

---

## Critical files referenced

- `src/main.ts` — bootstrap/glue to be dismantled into services + `app-tabs` component
- `src/sender.ts` — `Sender`/`SenderStatus`/`SenderClient`, to move to `services/sender/` with injected `SerialConnection`
- `src/storage.ts` — template pattern for the new `SerialConnection` service
- `src/planner.ts`, `src/quickTasks.ts` — largest files, migrated last
- `index.html` — shrinks to a top-level custom-element manifest
- `src/style.css` — split into `src/styles/` + per-component CSS
- `tsconfig.json`, `vite.config.ts` — decorator support added; singlefile plugin unchanged
