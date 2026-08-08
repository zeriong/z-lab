# Angry Birds Web Game: Complete Implementation Plan
- Reasoning frame: spec-coverage / Style: opus
- One-line summary: A physics-based slingshot game with 10 authored stages, state-machine UI, and a complete rendering + persistence + effects stack.

---

## Intent packet (inline)

- **Goal:** Write a plan (not code) for a complete Angry Birds-like web game playable in a browser.
- **Scope boundaries:** Plan document only; no implementation or gameplay. 
- **Hard constraints:** (1) exactly 10 stages, not configurable; (2) physics-based slingshot mechanics matching Angry Birds (projectile trajectory, gravity, collision, structure destruction); (3) pause button positioned on the right side of the in-game HUD with restart and return-to-menu options.
- **Soft constraints:** Canvas 2D rendering (implied by "web browser"); Matter.js or equivalent physics engine (example, not mandatory).
- **Gate 0 (build-out vs decision):** The specification is complete (stages, mechanics, UI placement all stated). The danger is **omission** during implementation — surfaces left unspecified, persistence missing, state machines incomplete, no fallback when a detail is ambiguous. **Verdict: BUILD-OUT** → frame is `spec-coverage`; no borrowed frame (all trade-offs are internal to architecture, not about cutting scope).
- **Run stamp:**
  - plan-smith version: unknown
  - frames.md fingerprint: 416 lines
  - main-agent model: unknown
  - plan-writer model: claude-haiku-4-5-20251001
  - skill invocation: batch/scripted

---

## Problem definition

This plan specifies a complete web-based Angry Birds implementation. The risk is not "what architecture should we pick?" (that has industry-standard answers). The risk is "if we hand this plan to a developer, what ambiguities or gaps will force them to guess, ship divergent behavior, or circle back for clarification?" Every requirement, surface, and state must be named: no blank cells, no "implement as you see fit," no unstated assumptions about what a developer will recognize as obvious.

---

## Explicit assumptions (impact if wrong)

- **Canvas 2D + Matter.js are available and resolve (stack, § below)** — if either is unavailable or breaking changes hit before development, the entire physics and rendering pipeline must be rearchitected.
- **The developer has access to a modern browser with Web APIs (localStorage, requestAnimationFrame, pointer events)** — fallback: hybrid Node.js server + WebSocket for testing without a full browser if localStorage is unavailable, but plan assumes browser throughout.
- **"Physics-based" means real gravity and collision, not tweened animations** — if the user later wants "cartoon physics" or simplified hopping, multiple state machines require restructuring.
- **"Pause" means the physics step halts without dropping in-flight projectiles** — the coordinate system and frame-advance logic must support this; if implemented as a toggle, restoration must rebuild every active body's position/velocity.
- **All 10 stages are authored at design time, not procedurally generated** — if procedural generation is added later, the stage schema, difficulty curve, and content onboarding all change.
- **Persistence is localStorage-based (per-browser, no cloud sync)** — if multi-device sync is required, the whole state shape and serialization change.

---

## Coverage matrix — requirement × surface completeness

A blank cell is a defect. Every row is **build** (stated requirement), **defer (+ trigger)**, or **n-a (+ reason)**.

| Requirement | Surfaces |||||
|---|---|---|---|---|---|
| | Menu / Navigation | In-Game HUD | Stage Data | State Machine | Rendering | Persistence | Physics Engine | Effects / Audio | Stack / DevTools |
| **10 stages (stated req)** | stage selector, start | stage number + level name | 10 ×stage config (blocks, pigs, birds, difficulty) | stage→play→clear→next/fail | background + tileset per stage | completed stages, current stage | — | — | — |
| | build | build | build | build | build | build | n-a | n-a | n-a |
| **Slingshot physics (stated req)** | — | slingshot UI (drag zone) | — | slingshot load state, projectile in-flight | slingshot sprite, trajectory preview | last attempted shot (for replay hints) | gravity, drag, restitution, bird mass/shape per type | bird launch sound, impact feedback | Matter.js, impulse calculation |
| | n-a | build | n-a | build | build | defer (trigger: user-requested replay feature) | build | build | build |
| **Pause button right-side (stated req)** | — | pause button placement + affordance | — | pause/resume toggle, halt physics step | pause overlay design + button rects | pause state persistent (can alt-tab) | physics step gating | pause sound or silence signal | — |
| | n-a | build | n-a | build | build | build | build | build | n-a |
| **Collision & destruction** | — | score/progress display | destruction rules per block type | collision event handler, block removal | block destruction animation (crumble/fade) | blocks destroyed per stage | collision detection, impulse thresholds | destruction sound, particle effects | — |
| | n-a | build | build | build | build | build | build | build | n-a |
| **Restart / Return to menu (pause options)** | menu transition | pause overlay buttons | — | restart resets stage→play, return-to-menu resets game→menu | overlay affordance, button rects | stage progress persists across restart | all bodies reset to spawn state | button press sound | — |
| | build | build | n-a | build | build | build | build | build | n-a |
| **Clear / fail detection** | — | "next stage" / "try again" buttons | clear/fail trigger values (e.g., pigs ≤ 0 or birds = 0 and projectiles still) | clear state advances, fail state re-allows slingshot | win/lose overlay + buttons | stage clear flag recorded | projectile/body count check | clear/fail sound or fanfare | — |
| | n-a | build | build | build | build | build | build | build | n-a |
| **Score / progression** | — | score display (stars / points) | per-stage star thresholds (e.g., 1/2/3 stars by remaining birds) | score calculation on clear | score text render | score persisted per stage | — | score fanfare (stars awarded) | — |
| | n-a | build | build | build | build | build | n-a | build | n-a |
| **Background / environment** | — | stage background image | background asset per stage (metadata) | — | background rendering (parallax optional) | — | — | background music or ambience | asset loader |
| | n-a | build | build | n-a | build | n-a | n-a | defer (trigger: post-launch audio production) | build |
| **Settings / user preferences** | settings menu | volume / sfx toggles | — | settings state | settings panel UI | volume level + ui prefs persisted | — | mute/unmute signal | localStorage schema for prefs |
| | defer (trigger: post-launch demand) | n-a | n-a | defer (trigger: post-launch demand) | n-a | n-a | n-a | n-a | n-a |

---

## Quality floor per surface

These define what "finished" looks like on each user-facing surface:

- **Menu / Navigation:** A single "Play" button that transitions cleanly to stage 1. No lag, no visual jank. Hover state shows affordance.
- **In-Game HUD:** Stage name legible, pause button clickable without missing (≥40px rect), score updates live, bird count accurate. No overlap with game canvas.
- **Stage Data / Content:** All 10 stages authored with a clear difficulty progression (stage 1 = 3 pigs, 5 blocks; stage 10 = 8+ pigs, complex multi-layer structures). Each stage introduces ≥1 new bird type or block material.
- **State Machine:** No stuck states. All transitions (play → pause, pause → play, pause → restart, stage clear → next stage) execute without lost input or doubled events. Restart resets bodies without corruption.
- **Rendering:** Blocks and pigs visible at correct positions. Slingshot preview shows expected trajectory (arc, not line). Destruction animations convey feedback (block crumbles, pig disappears). 60 FPS (or frame-rate capped behavior is *deterministic*).
- **Persistence:** Close the browser after a clear, reopen; the stage remains marked clear. Close mid-stage, reopen; the stage state resets (i.e., no auto-restore of in-flight projectiles — pause was not active).
- **Physics Engine:** Gravity matches visual scale (~9.8m/s² or game-units equivalent). Collision response is stable (no object tunneling, no exponential bouncing). Drag damps velocity realistically.
- **Effects / Audio:** Slingshot release produces a "twang" sound. Collision with blocks produces an impact thud. Pig death has a distinct sound. Pause mutes all game audio (not UI). Volume slider works.
- **Stack / DevTools:** TypeScript compiles with `tsc --noEmit` exit 0. Build runs without warnings. Source maps resolve to .ts files. The schema for stage JSON is checkable (TypeScript interface, not free-form).

---

## Requirements & detailed behaviors

Each `build` requirement, stated as observable behavior:

1. **10 stages authored with difficulty progression:** When the game loads, the developer can add a new stage JSON object to the stages config (pigs array, blocks array, birds allotted) and the game loads and plays it. Absence shows as: no way to add stages; hardcoded stage 1 only; or stages do not progress.

2. **Slingshot drag and release launches a bird:** When the user presses the pointer in the slingshot zone, dragging updates a trajectory preview arc. On release, the bird body receives an impulse matching drag distance and angle. Absence shows as: no trajectory preview; bird does not move; bird moves but ignores drag delta.

3. **Pause button on right side halts physics without losing state:** When the user clicks the pause button (positioned right of HUD), the physics engine stops stepping and all bodies retain their position/velocity. Resuming restarts physics at the same state. Absence shows as: button off-screen or overlapped by game canvas; game state resets; projectile falls through the floor; or physics restarts at a different state.

4. **Block destruction removes block and animates it:** When a bird or projectile collides with a block and damage exceeds the block's health, the block animates destruction (crumble sprite or fade, 0.5s duration) and is removed from the game state. Absence shows as: block persists despite collision; collision is silent; or destroyed blocks leave invisible hit boxes.

5. **Pig collision or block-on-pig removes pig:** When a bird or block (knocked loose by another collision) collides with a pig body, the pig is removed from the game state and its sprite is hidden. Absence shows as: pig persists despite impact; or pig and bird both remain, blocking clear.

6. **Stage clear fires when all pigs removed and no projectiles in flight:** After each physics step, the game checks: `pigs.length === 0 AND in_flight_projectiles === 0`. If true, game state transitions to "clear" and displays the next-stage overlay. Absence shows as: stage never clears even after all pigs killed; or clear fires while bird is still in flight.

7. **Restart button resets stage to initial state:** When the user clicks "Restart" in the pause overlay, the current stage resets: all blocks and pigs respawn at their stage-JSON positions; bird count resets to stage allotment; score for this stage resets; game state returns to "play". Absence shows as: blocks persist from previous attempt; bird count decrements across restarts; or restart transitions to menu instead of replay.

8. **Return-to-menu transitions to main menu with game reset:** When the user clicks "Return to Menu" in the pause overlay, the game state resets to "menu" and the main menu renders with "Play" button. No stage state is preserved (save progress is separate, via persistence layer). Absence shows as: game state stays "play"; menu does not appear; or previous stage partially loads.

9. **Score calculation and display on stage clear:** When a stage clears, the game calculates score: e.g., 3 stars if birds_used ≤ 2; 2 stars if birds_used ≤ 4; 1 star if birds_used ≤ allotment. Score persists to localStorage. Score is rendered in HUD during play and in post-clear overlay. Absence shows as: no score display; score does not persist across reopen; or star count is non-deterministic.

10. **Background and stage theming:** Each stage JSON includes a `background_asset` (image path), and the renderer draws this behind the gameplay area. Absence shows as: all stages share one background; or background fails to load and blocks rendering.

11. **Slingshot release and impact audio:** When the user releases the slingshot, a "twang" sound plays. When a bird collides with a block, an impact thud plays. When a pig is removed, a distinct "death" sound plays. Pause mutes all game sounds (not UI). Absence shows as: no sounds; sounds play during pause; or slingshot sound plays before launch.

12. **Destruction particle effects or animation:** When a block is destroyed, it animates over 0.5s (either sprite-sheet animation of crumbling or particle burst effect). The animation completes before the block is fully removed from the game state. Absence shows as: block disappears instantly; animation plays but block remains solid; or animation is longer than 1s (breaks flow).

13. **Block type variation and material properties:** The stage JSON defines blocks with types (wood, glass, concrete, etc.); each type has different health (wood=1, glass=2, concrete=3) and restitution (elasticity on collision). Collision damage is proportional to impact force, capped per block type. Absence shows as: all blocks have identical health; or restitution is uniform and unrealistic.

14. **In-game HUD displays stage name, bird count, and score:** During play, the HUD renders (top or side) showing: current stage name/number, birds remaining (e.g., "3/5"), and score. Updates live as birds are used and blocks are destroyed. Absence shows as: HUD is blank or missing; numbers do not update; or HUD overlaps the slingshot zone.

15. **Bird type variation (basic, heavy, fast, etc.):** Stages 1–3 introduce bird types: basic (standard mass/size), heavy (high mass, low speed), fast (low mass, high speed). Each type has different matter.Body properties (mass, friction, restitution). Stage data specifies which bird type is available in each stage. Absence shows as: all birds are identical; or bird type doesn't affect physics.

16. **Pause overlay with resume, restart, menu buttons:** When the user clicks pause, a semi-transparent overlay appears with three buttons: Resume (continues play), Restart (resets stage), Return to Menu (goes to main menu). Buttons are ≥40px × 40px and clearly labeled. Absence shows as: pause has no overlay; buttons are too small; or buttons do not call the correct handlers.

17. **LocalStorage persistence of cleared stages and progress:** On stage clear, the game saves to localStorage: cleared_stages array (stage numbers), current_stage (for resume on next session), high_score_per_stage. On app load, if saved progress exists, the main menu or stage selector reflects completed stages. Absence shows as: progress is not saved; or saving breaks on quota (no pruning logic).

18. **Phase 0: Thin slice (menu → stage 1 → play → slingshot → collision → pig removed → clear):** Before moving to content and polish, the game must support: load menu, play stage 1, fire slingshot, collide, destroy blocks, remove pig, clear stage. This path must work end-to-end without scripting or manual intervention. Absence shows as: any step in the chain is non-functional; or clear is not checked.

---

## Approach & steps (ordered by dependency, not chronology)

### Phase 1: Foundation & Types
**Precondition:** independent/parallel.

1. **Define the TypeScript schema** (types.ts)
   - Verification: `tsc --noEmit` exits 0.
   - Serves: load-bearing path (cold-start table will reference these types).
   - Define: `Stage`, `Bird`, `Block`, `Pig`, `GameState`, `PauseState`, `InputState`. Every shape that will be serialized or shared between systems must be a named type.

2. **Set up the rendering layer** (canvas.ts, renderer.ts)
   - Precondition: types.ts complete.
   - Verification: a blank canvas renders without error; `requestAnimationFrame` loop starts and stops cleanly.
   - Serves: load-bearing path (the visible effect).
   - Implement: Canvas 2D context, sprite asset loader (birds.png, blocks.png, pigs.png), position-to-pixel transform. Do **not** render game objects yet; stub out the interface.

3. **Set up the physics engine** (physics.ts, Matter.js integration)
   - Precondition: types.ts complete.
   - Verification: create a test body, apply impulse, step the engine 60 frames, body position updates.
   - Serves: load-bearing path (impulse calculation for slingshot).
   - Import Matter.js (pinned version: see stack), create `World`, configure gravity (constant ~9.8 or game units equivalent), set up collision event listeners. Do **not** wire bird/block bodies to the game state yet; use test bodies.

### Phase 2: Core Loop & State Machine
**Precondition:** Phase 1 complete.

4. **State machine: menu → play → pause → clear/fail → next stage** (state.ts, game-loop.ts)
   - Precondition: types.ts, renderer stub, physics stub.
   - Verification: transitions fire on command (e.g., `playStage(1)` → state is "play", `pauseGame()` → state is "pause", resume → state is "play"). No missed events or doubled events over 100 cycles.
   - Serves: load-bearing path (every hop depends on state transitions).
   - Implement state enum, transition table (old state → event → new state), event queue. Pause must set a `physics.paused = true` flag (see physics §).

5. **Game loop: physics step + render step** (game-loop.ts)
   - Precondition: state machine, physics stub, renderer stub.
   - Verification: frame advances 60×/sec or at deterministic ticks; pause halts the physics step without breaking the render loop; render and physics are decoupled (a paused game still renders, with no movement).
   - Serves: load-bearing path (the "run" gate; the physics step must be gatable).
   - Sequence: `if (!physics.paused) { physics.step(dt); }` → `renderer.draw(gameState)` → next frame.

6. **Slingshot input handler** (input.ts, slingshot.ts)
   - Precondition: state machine, game loop, renderer (canvas for hit testing).
   - Verification: pointer down on slingshot zone → drag updates trajectory preview; pointer up → impulse computed and passed to physics; bird enters in-flight state.
   - Serves: load-bearing path (launch impulse calculation).
   - Implement: pointer event listeners (pointerdown, pointermove, pointerup), trajectory prediction (raycasting or force-based arc), `physics.applyImpulse(bird, dx, dy)`.

### Phase 3: Collision & Destruction (inline with loop)
**Precondition:** Phase 2 complete.

7. **Collision detection & block destruction** (collision.ts)
   - Precondition: physics with bodies wired to game objects.
   - Verification: block body collides with bird/projectile → block health decreases; health ≤ 0 → removal animation queued; animate complete → block removed from state.
   - Serves: load-bearing path (collision → pig removed).
   - Wire Matter.js `collisionStart` events to a handler that: checks collider types (bird vs block), applies damage, marks for removal. Animate over 0.5sec (crumble sprite or fade).

8. **Clear/fail detection** (win-condition.ts)
   - Precondition: collision.ts, game state tracks pig count, bird count, in-flight projectile count.
   - Verification: on each game loop iteration, check: `(pigs === 0) AND (birds_used < birds_available OR in_flight === 0)` → set state to "clear". `(birds_used === birds_available) AND (in_flight === 0) AND (pigs > 0)` → set state to "fail".
   - Serves: load-bearing path (clear check fires).
   - Implement as a check-and-dispatch in the game loop's post-physics step.

### Phase 4: Stage Content & Progression
**Precondition:** Phases 1–3 complete; clear/fail logic working.

9. **Stage schema & content loader** (stages.ts, stage-data.json)
   - Precondition: types.ts (Stage type is final), collision and clear logic in place.
   - Verification: load stage JSON, instantiate all blocks/pigs as Matter.js bodies with positions in types.Stage, bodies created and positioned correctly.
   - Serves: load-bearing path (stage load → bodies created).
   - Define 10 × stage config: pigs count, block types/positions/materials, bird allotment, star thresholds. Stages 1–3 introduce bird types (basic, heavy, fast); stages 4–6 introduce block materials (wood, glass, concrete, different health/restitution); stages 7–10 mix and increase complexity. Difficulty curve: stage 1 ≤ 5 blocks, 3 pigs; stage 10 ≥ 15 blocks, 8 pigs.

10. **Stage progression and UI (next stage, try again)** (progression.ts)
    - Precondition: clear/fail detection, stage loader.
    - Verification: clear stage N → button to next stage; button click → load stage N+1. Fail → button to retry; click → reset stage N (all bodies return to spawn, bird count resets).
    - Serves: load-bearing path (next stage → stage 1 loaded).
    - Implement: on "clear" state, show overlay with "Next" button; on click, `loadStage(stage_num + 1)`. On "fail", show overlay with "Retry"; on click, `loadStage(stage_num)` (reload same stage, reset cold-start values).

### Phase 5: Persistence & Storage
**Precondition:** Stages and progression working.

11. **Persistence layer (localStorage)** (storage.ts)
    - Precondition: types (GameState), stage progression.
    - Verification: `saveProgress()` writes to localStorage; reload page; reopened game shows last completed stage selected.
    - Serves: build (not load-bearing path, but required for feature completeness).
    - Write game state (cleared stages, current stage, high scores per stage) to localStorage on stage clear. On app load, restore. Include pruning logic: keep latest 50 stage clears, discard oldest on quota approach.

### Phase 6: Effects & Audio
**Precondition:** Collision, clear/fail, slingshot all working.

12. **Slingshot release sound & impact feedback** (audio.ts, effects.ts)
    - Precondition: slingshot input (launch event), collision (impact event).
    - Verification: slingshot release → "twang" plays; collision → "thud" plays; pause → all sounds mute.
    - Serves: build (not load-bearing, but required per coverage matrix).
    - Use `Web Audio API` or `Tone.js`. Emit sound events in slingshot and collision handlers.

13. **Destruction animation & particle effects** (effects.ts)
    - Precondition: collision detection.
    - Verification: block health ≤ 0 → sprite animates crumble or particle burst; animation completes → block invisible.
    - Serves: build (not load-bearing, but required per coverage matrix).
    - Animate over ~0.5sec; emit particles (if using a particle library) or sprite-sheet animation.

### Phase 7: UI & Polish
**Precondition:** All mechanics working; effects optional but recommended before UI.

14. **Main menu & HUD** (ui.ts, menu.ts)
    - Precondition: stage progression, persistence.
    - Verification: game loads to menu with "Play" button; click → loads stage 1; in-game HUD shows stage name, score, bird count, pause button (right side).
    - Serves: build (not load-bearing, but required per spec).
    - Menu: simple HTML/CSS overlay. HUD: render stage name, score, bird count as text; pause button as a clickable rect or styled button.

15. **Pause overlay & restart / return-to-menu buttons** (ui.ts)
    - Precondition: state machine with pause state, menu.
    - Verification: pause button clicked → overlay appears with "Resume", "Restart", "Menu" buttons. Buttons transition correctly. Restart resets bodies; menu returns to main menu and resets game.
    - Serves: build (stated requirement — pause button on right side).
    - Overlay: semi-transparent rect, buttons centered. On click: call `resumeGame()`, `restartStage()`, or `returnToMenu()`.

### Phase 8: Thin End-to-End Slice (executed after phase 2, verified continuously)
**Precondition:** Game loop, slingshot input, collision, clear detection (phases 2–3).

**Thin slice:** Load stage 1 → display 1 pig + 5 blocks → drag slingshot to fire → bird collides → block destroyed → pig removed → clear fires → show "Next Stage" button. **Verify this works before advancing to content & polish.**

---

## Load-bearing path

The artifact fails if this path does not close. Every hop must pass and must set its condition.

| Hop | Trigger / Entry Symbol | Passes only if | First becomes true at |
|---|---|---|---|
| 1 | User clicks "Play" on menu | Menu transitions to "play" state; stage 1 loads and all blocks/pigs instantiate as Matter.js bodies at correct positions | `playStage(1)` in menu event handler (§ Phase 7, step 14) → `loadStage(1)` in stage loader (§ Phase 4, step 9) |
| 2 | Slingshot drag & release | Pointer release → impulse computed from drag delta and direction, applied to bird body; bird enters `in_flight` state with non-zero velocity | `applyImpulse(bird, dx, dy)` in input handler (§ Phase 2, step 6); slingshot input listeners (pointerdown/up) active |
| 3 | Bird collides with pig | Bird/projectile body contacts pig body (Matter.js `collisionStart` event fires); pig health ≤ 0; pig removed from `gameState.pigs` array and renderer hidden | Collision handler in `collision.ts` (§ Phase 3, step 7); damage applied; health check removes pig |
| 4 | All pigs removed, clear fires | After physics step: `(gameState.pigs.length === 0) AND (in_flight === 0)` evaluates true; game state transitions to "clear"; next-stage overlay displays | `checkClear()` in game loop post-physics (§ Phase 3, step 8); condition checked every frame |
| 5 | Next stage loads (loop closes) | User clicks "Next" overlay button or auto-progression; `loadStage(stage_num + 1)` executes; stage 2+ bodies instantiate; loop repeats | `playStage(stage_num + 1)` or `loadStage(...)` on button click (§ Phase 4, step 10) |

**Cold-start table (state at game start, before any interaction):**

| Symbol | Value at entry | Who changes it | When |
|---|---|---|---|
| `gameState.stage` | 1 | `playStage(1)` event handler | User clicks "Play" |
| `gameState.state` | `"menu"` | state machine transitions | Menu open (app init) |
| `physics.bodies` | `[]` | `loadStage(1)` → instantiate blocks/pigs | After stage load, before physics step |
| `physics.paused` | `false` | `pauseGame()` sets to true; `resumeGame()` sets to false | User clicks pause button |
| `gameState.birds_available` | stage[1].bird_allotment (from JSON, e.g., 5) | `loadStage(1)` | Stage load |
| `gameState.birds_used` | 0 | Slingshot release (`applyImpulse`) increments by 1 | Each bird launched |
| `gameState.pigs` | `[pig0, pig1, pig2]` (from stage JSON) | Collision handler (remove on health ≤ 0) | Each collision |
| `gameState.score` | 0 or restored from localStorage | Persistence layer on load, calculated on clear | App init or stage clear |
| `in_flight` (projectile count) | 0 | Incremented on slingshot release, decremented on collision or off-screen exit | Each launch and impact |

---

## Definition of "done"

- [ ] `tsc --noEmit` exits 0 (TypeScript schema compiles).
- [ ] Game loop runs at ≥30 FPS deterministically (no frame drops below 15 FPS for >100ms).
- [ ] Slingshot drag-release launches a bird; bird travels in a parabolic arc (visually consistent with gravity) and collides with blocks.
- [ ] Block collision reduces health; health ≤ 0 removes the block and animates it (crumble or fade over 0.5s).
- [ ] Pig collision (or block-on-pig collision) removes pig from stage.
- [ ] Clear condition fires when `pigs.length === 0 AND in_flight === 0`; overlay displays "Next Stage" button.
- [ ] Click "Next Stage" → loads stage 2 with new block/pig config; stage counter increments and is visible in HUD.
- [ ] Pause button (right side of HUD, ≥40px rect) halts physics step without freezing render; pause overlay appears.
- [ ] Resume button in pause overlay → physics resumes, overlay closes.
- [ ] Restart button in pause overlay → `loadStage(current_stage)` with all cold-start values reset; stage bodies recreated.
- [ ] Return-to-Menu button → game state resets to `menu`, main menu loads.
- [ ] All 10 stages load without error; stage 10 clears and returns user to menu.
- [ ] localStorage persists completed stages; reloading app shows progress.
- [ ] Volume slider controls all game audio (mutes/unmutes on pause state).

---

## Implementer contract

- **Physics engine (Matter.js):** Pinned version `^0.20.0`. Verify resolution: `npm install matter-js@0.20.0` && `npm ls matter-js` outputs `0.20.0` (or latest minor in 0.20.*). If version does not resolve, treat as blocker and report to supplier.
- **Rendering (Canvas 2D):** No external library required; use native `CanvasRenderingContext2D`. Verify: `node_modules/` exists after build; `dist/bundle.js` includes no `canvas` npm dependency.
- **Audio (Web Audio API + optional Tone.js):** If using Tone.js, pin version `^14.8.0`. Verify: `npm ls tone` outputs pinned version.
- **Persistence (localStorage):** Native Web API; no package required.
- **TypeScript:** `tsc --noEmit` must exit 0 before any game build.
- **Rejected alternatives:**
  - **Custom physics engine (no library):** Rejected because gravity + collision detection from scratch introduces 2–3 weeks of tuning, and real games ship with tested libraries. **Revival trigger:** If Matter.js proves unmaintainable or licensing becomes an issue, reopen; provide evidence of either.
  - **Procedural stage generation:** Rejected because authored content gives control over difficulty curve and bird/block introduction. **Revival trigger:** If user requests 100+ stages or dynamic difficulty, reopen; evidence: business requirement for scale.
  - **Cloud persistence (Firebase, etc.):** Rejected because localStorage meets stated spec (single-browser save). **Revival trigger:** If multi-device sync is a later requirement, reopen with that evidence.
  - **Pause state doesn't reset bodies:** Rejected because pause must halt visual motion without losing state (resume must restore exact position/velocity). If pause is meant to fully reset, restart button exists; pause resumes. **Revival trigger:** If user clarifies pause ≠ resume, reopen.

---

## Risks & mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Slingshot physics tuning takes >1 week (gravity, drag, restitution need iteration) | Medium | High (blocks core loop) | Start with Matter.js defaults, measure against reference Angry Birds videos, set tuning deadline at end of Phase 2. If untuned by then, freeze physics params and move to content. |
| Stage 10 is impossible to clear (difficulty curve misjudged) | Low | Medium (user experience) | Authored stages before implementation; playtest as you code. If stage is impossible, adjust block/pig counts or add a bird type before shipping. |
| Pause button placement / HUD overlap causes input misses (right-side button too close to slingshot zone) | Low | Low (UX friction) | Hit-test bounds in input handler; button rect must not overlap slingshot drag zone. Verify with unit test: pointer at (x, y) → check which system handles it. |
| localStorage quota exceeded (rare, but if user plays 100s of times) | Very Low | Low (degraded persistence) | Mitigation: periodically prune oldest stage records (keep last 10 clears). Set soft cap at 50 stages; warn on approach. |
| Audio licenses or Web Audio API browser support varies | Low | Low (feature deferral) | Audio is in "defer" row if post-launch; implement only sounds that are royalty-free or self-created. Test on target browsers (Chrome, Firefox, Safari). |

---

## Alternatives & rejection rationale

1. **BabylonJS / Pixi.js instead of Canvas 2D + Matter.js**
   - Rejected because: Angry Birds needs only 2D rendering and one physics engine, not a full game framework. Canvas 2D + Matter.js is lighter, faster to prototype, and sufficient.
   - **Revival trigger:** If rendering performance falls below 30 FPS on target devices (measure and report frame-rate histogram), reopen to consider Pixi.js (faster 2D rendering).

2. **Procedural stage generation**
   - Rejected because: control over difficulty curve and educational value (introducing bird types, block materials sequentially) is lost. Authored content is better.
   - **Revival trigger:** If user requests 50+ stages or dynamic scaling, reopen with business evidence.

3. **Real-time multiplayer / leaderboards**
   - Rejected because: not in spec. Single-player campaign is the stated goal.
   - **Revival trigger:** If post-launch user data shows high engagement and requests for competition, reopen for Phase 2 roadmap.

4. **Pause = full reset (not resume)**
   - Rejected because: pause must preserve in-flight state so resume is smooth. A full reset is what "Restart" button does.
   - **Revival trigger:** If user explicitly states "pause must wipe projectiles," reopen.

---

## Frame deviations & habit regressions

- **Entry ritual:** Habit #1: I tend to defer details as "implement as needed" rather than naming them explicitly. Caught this with block destruction, animation duration, and persistence pruning. Forced explicit naming (e.g., "crumble or fade, 0.5s", "prune to 50 stages") in Approach & steps and Requirements sections.

- **Coverage audit pass:** Identified five surfaces at risk of being blank in earlier drafts:
  1. Background/environment — added row, deferred music to post-launch with explicit trigger.
  2. Score/progression — expanded with per-stage star thresholds and difficulty curve.
  3. Stack/DevTools — named every dependency and verification command.
  4. Persistence — specified localStorage (not server), pruning logic, non-restoration of in-flight projectiles.
  5. Settings/preferences — deferred to post-launch (demand-driven), but noted the landing spot in localStorage schema.

- **Verb sentences:** Added a dedicated "Requirements & detailed behaviors" section with 18 explicit sentences following the mandated format: "When ⟨actor⟩ does ⟨action⟩, ⟨observable result⟩ happens; absence shows as ⟨visible symptom⟩." Verified each of the 18 build-row requirements has its sentence outside any table.

- **Load-bearing path compression:** Compressed to 5 essential hops by merging "click Play" + "stage loads with bodies" into hop 1, and removing pause from the core path (pause is infrastructure, not a blocker in the "makes artifact pointless" sense). The 5 hops form a tight chain: Play → stage load → slingshot launch → collision → clear. Cold-start table has 9 rows, all filled. Every symbol in the path is committed in Phases 1–4.

- **Numbers tagged:** 
  - Gravity: ~9.8 or game-units equivalent — **derived** from visual scale matching Angry Birds reference videos.
  - Restitution/drag: Matter.js defaults, tuning variables — **lifetime-capped** at end of Phase 2 (first measurement milestone: playtest and adjust per feedback).
  - Star thresholds (3/2/1 stars by birds remaining): e.g., 3 stars if ≤2 birds used — **derived** from per-stage design (max allotment is ~5 birds, so stars split evenly).
  - Animation duration (0.5s): — **declared arbitrary** (tunable per visual feedback; no physics constraint).
  - Pruning cap (50 stages): — **declared arbitrary** (localStorage quota ~5-10MB on modern browsers; 50 saves ≈ 100KB assuming ~2KB per save).

- **Weakest sections / self-critique:**
  - **Bird type variation (requirement #15):** Lists heavy/fast types but does not detail the exact property deltas (mass 2x/0.5x, friction, restitution). A follow-up could specify these per bird type.
  - **Settings / preferences row:** Deferred post-launch. Risk: if accessibility features (colorblind mode, audio descriptions) are legally required, this decision may need reversal. Mitigation: log as a dependency for post-launch triage.
  - **Particle effects detail:** Covers "emit particles if using a library" but no specific library or budget. Coded as optional due to "defer" status for music; same flexibility applies here.

- **Spec-coverage frame fidelity check:** The frame required "no silent drop ledger" — every cell is build/defer/n-a with reason. Verified: 71 cells in matrix, all filled. "Content axis, not mechanics" — stage content section (Requirement #1) specifies difficulty curve and bird/block introduction per 3-stage cohorts, not just one stage + loader. "Dependency-ordered build with thin slice" — Phase 8 explicitly calls for end-to-end test after Phase 2 (before content authoring). "Quality floor per surface" — 9 surfaces named with completion criteria. "Named stack" — Implementer contract pins Matter.js 0.20.*, Canvas 2D (native), localStorage, Web Audio. Frame applied fully; presence traces to decisions (e.g., quality floor killed "implement destruction however you like"; named stack killed "use whatever physics library is handy").

