# Browser Angry Birds Game — Implementation Plan
- Reasoning frame: spec-coverage / Style: opus
- One-line summary: Complete 2D browser-based slingshot physics game with 10 sequenced stages, Canvas rendering, Matter.js physics, and persistent progress tracking.

## Requirement × Surface Coverage Matrix

| Requirement | Canvas Rendering | Physics Engine | Stage Data/Progression | Slingshot Input | Collision/Destruction | Score/Clear Logic | Pause UI | Persistence | Done? |
|---|---|---|---|---|---|---|---|---|---|
| 10 distinct stages | — | — | **build** | — | — | — | — | — | ✓ |
| Player launches projectiles | — | **build** | — | **build** | — | — | — | — | ✓ |
| Projectiles follow physics (gravity, arc) | — | **build** | — | — | — | — | — | — | ✓ |
| Targets break on collision | — | **build** | — | — | **build** | — | — | — | ✓ |
| Stage clears when targets destroyed | — | — | — | — | — | **build** | — | — | ✓ |
| Pause button (right side) | **build** | — | — | — | — | — | **build** | — | ✓ |
| Restart/Menu in pause overlay | — | — | — | — | — | — | **build** | — | ✓ |
| Progress persists across sessions | — | — | — | — | — | — | — | **build** | ✓ |

**Quality floor per surface:**
- **Canvas Rendering:** visual objects are distinct, stage background is recognizable, particle effects (glass/wood break) are visible
- **Physics Engine:** projectile motion appears realistic; falling objects settle; collision feedback is observable (objects move on impact)
- **Stage Data:** stages load sequentially with increasing difficulty (structure count, target count, or structure complexity)
- **Slingshot Input:** drag-to-aim is responsive; trajectory preview is visible; launch direction is player-controlled
- **Destruction:** structures visibly break into pieces or disappear; sound/visual feedback on hit (not mandatory, but quality floor includes *something* observable)
- **Clear Logic:** stage-complete state is unambiguous (visual message or state change); player cannot launch after clear
- **Pause UI:** pause overlay dims/occludes the game; buttons are clickable; return to game or menu is possible
- **Persistence:** refreshing the page retains the highest stage reached; manually clearing storage resets progress

## Architecture & Stack

### Physics Engine: Matter.js (Library)
**Decision:** Use Matter.js 2.0.x over custom physics.
**Rationale:** Angry Birds requires reliable collision detection, rigid-body constraints, and angular momentum — custom physics costs 2–4 weeks to validate, while Matter.js is proven in games and ships constraint-solving out of the box. The slingshot mechanic's arc prediction also needs accurate forward-simulation, which Matter.js exposes via step/query APIs.
**Revival trigger:** If Matter.js initialization fails or constraint performance degrades below 60 FPS at 20+ active objects, evaluate lightweight alternatives (Planck.js, custom Circle-vs-AABB solver).

### Rendering: Canvas 2D + RequestAnimationFrame
**Decision:** HTML5 Canvas 2D (not WebGL).
**Rationale:** Angry Birds' 2D nature does not require shaders. Canvas is simpler to debug, synchronizes naturally with Matter.js discrete steps, and performs adequately on mobile browsers. WebGL adds build complexity without proportional benefit.
**Stack:**
- `Matter.js@^0.19.0` (physics engine)
- `lodash@^4.17.21` (utility library, for batch transforms)
- No build tool initially (inline script + module pattern); if growth exceeds 1500 LOC per file, migrate to Vite + ES modules.

### Stage Data Structure
**Schema (JSON):**
```json
{
  "stageId": 1,
  "name": "Forest Clearing",
  "objectives": {
    "targetCount": 3,
    "clearStarThreshold": [30, 50, 70]
  },
  "structures": [
    { "x": 400, "y": 300, "type": "wood-block", "width": 30, "height": 60, "rotation": 0 },
    { "x": 500, "y": 280, "type": "stone-block", "width": 60, "height": 30, "rotation": 45 }
  ],
  "targets": [
    { "x": 450, "y": 250, "type": "pig", "radius": 15, "health": 1 }
  ],
  "slingshot": { "x": 100, "y": 400 },
  "difficulty": 1
}
```
**Progression:** Stages load sequentially. Structure complexity escalates: stage 1–3 (4–6 objects, simple layouts), 4–7 (8–12 objects, multi-tier), 8–10 (14–20 objects, chain-reaction puzzles).
**Load mechanism:** On stage entry, POST request fetches JSON from `/stages/<id>.json` (or embedded in the HTML for offline play).

### Slingshot Input & Trajectory UX
When player mouses down on slingshot:
- Record mouse position; enter "aim" state
- Render a line from slingshot to cursor (aim vector)
- On mouse move, update line angle
- Display arc preview: compute 0.5s forward-simulation in Matter.js, render predicted trajectory as dashed arc on canvas
- On mouse up, apply impulse to projectile; enter "launching" state

**Verb requirement:** When player drags the slingshot and releases, the projectile launches in the aimed direction with velocity proportional to drag distance; its absence shows up as the projectile ignoring the player's input or launching in a fixed direction.

### Collision & Destruction Rules
**Structure destruction:** Objects with health > 1 take damage on impact (velocity-based); at health ≤ 0, remove from world and render particle burst (3–5 fragments fade-out over 0.3s).
**Target elimination:** Pigs have health 1; first collision destroys them (death particle effect).
**Collision detection:** Matter.js collision events trigger destructor checks; impulse applied to both bodies (realistic rebound).

**Verb requirement:** When a projectile collides with a structure, the structure's health decreases; when health reaches zero, it disappears from the canvas and from the physics world; its absence shows up as the structure remaining on screen or not respecting collision.

### Stage Clear & Scoring
**Clear condition:** Player advances when `targetCount === 0` (all pigs dead). On clear, freeze gameplay for 1.5s, display "Stage Clear!" message, show star count (1–3 based on clearStarThreshold).
**Stars:** Based on projectile count used. Fewer projectiles = higher stars (score logic encoded in clear state; see Implementer Contract).
**Score display:** On HUD, show "Projectiles: 5 | Best: 3⭐".

**Verb requirement:** When all targets are destroyed, the game transitions to a clear state; the player cannot launch new projectiles; a message appears on screen; its absence shows up as the game continuing to accept input or no clear indication that the player succeeded.

### Pause Overlay & State Machine
**States:** 
- `MENU` — title screen, stage select
- `LOADING` — stage asset fetch (< 100ms typically)
- `PLAYING` — active gameplay, player can launch
- `PAUSED` — overlay active, gameplay frozen, accept menu/resume input
- `CLEAR` — stage cleared, show stars, accept next/menu

**Pause trigger:** Button on right side of HUD. Button click → render semi-transparent overlay (rgba(0, 0, 0, 0.7)) with two centered buttons: "Resume" and "Main Menu". Matter.js world pauses (no step calls).

**Verb requirement:** When the player clicks the pause button, a semi-transparent overlay appears on top of the game canvas; it contains clickable buttons labeled "Resume" and "Main Menu"; clicking "Resume" returns to gameplay; clicking "Main Menu" navigates to stage select; its absence shows up as the pause button doing nothing or the game continuing to run while the overlay is visible.

### Persistence & Storage
**Storage method:** `localStorage` (simpler for MVP; WebSQL if data > 5MB).
**Data stored:** `{ highestStageUnlocked: <N>, stageScores: { "1": 2, "2": 3, ... } }`.
**On page load:** Check localStorage for `playerProgress`; if found, load it; if not, start at stage 1.

**Verb requirement:** When the player completes a stage and closes the browser, reopening the game shows the same highest stage reached; the player can select any completed stage to replay; its absence shows up as the game resetting to stage 1 or the player being unable to select completed stages.

## Load-Bearing Path

| Hop | Name | Passes only if | First becomes true at |
|---|---|---|---|
| 1 | Player presses play on stage select | Stage ID is valid and stage JSON has loaded | `LOADING` → `PLAYING` transition (fetch `/stages/<id>.json` completed) |
| 2 | Slingshot is ready (ball in place) | Projectile body exists in Matter.js world; slingshot sprite renders at correct position | Initialization step: on `PLAYING` entry, create projectile body + render slingshot sprite |
| 3 | Player launches projectile | Mouse-up event fires within the slingshot drag zone; impulse is applied to projectile body | Slingshot input listener detects release; `applyForce()` is called on projectile |
| 4 | Structures break on projectile impact | Matter.js collision event fires; object health ≤ 0; physics body is removed from world | Collision listener updates health; destructor removes body and cancels rendering of that object |
| 5 | Stage clears when targets are destroyed | Target count === 0 in the world; state transitions to `CLEAR` | After each collision, recount targets; on count === 0, trigger clear logic |

### Cold-Start Table

| Symbol / Precondition | Value at Entry | Who changes it | When/how |
|---|---|---|---|
| Stage JSON file | Fetched from `/stages/<N>.json` | Fetch listener | `LOADING` state calls `fetch()`, waits for 200 OK |
| Matter.js Engine instance | Created and running | `initEngine()` on scene entry | Called during `PLAYING` transition; `Engine.run()` starts the loop |
| Projectile body | Present in world at slingshot position | Projectile spawner | After slingshot renders; `Body.create({ shape: "circle" })` + `World.add()` |
| Target count | Equals stage JSON's `objectives.targetCount` | Destructor on collision | Each collision listener checks `--targetCount`; recount step persists the value |
| Player input state | "ready" (awaiting mouse-down) | Slingshot input listener | Mouse-down → "aiming"; mouse-up → "launching"; launching completes → "ready" (new projectile spawned or stage cleared) |
| Game state | `PLAYING` | Scene manager | `startStage(id)` calls `setState(PLAYING)` after JSON loads |

## Alternatives & Rejection Rationale

### Alternative 1: Physics Engine
**Option A — Matter.js (chosen):** Library, 0.19.0.  
**Option B — Custom physics:** Hand-code rigid-body solver.  
**Rejection of B:** Custom physics requires collision, impulse, and constraint solving. In the validation corpus for browser games, custom physics cost 2–4 weeks to validate (circle/AABB, response resolution, sleeping states). Matter.js is >10 years stable in production and exposes the exact APIs needed (ray queries for trajectory preview, sleeping for performance). Revival trigger: if Matter.js compilation fails, bundle size exceeds 200 KB minified, or runtime performance < 60 FPS with 20+ bodies, re-evaluate Planck.js (lighter) or custom Circle-Circle only.

### Alternative 2: Stage Data Format
**Option A — JSON files (chosen):** Each stage is a separate `.json` file.  
**Option B — Procedural generation:** Compute stages dynamically.  
**Rejection of B:** Procedural generation removes authorial control over difficulty curve and puzzle design. A good Angry Birds stage is hand-crafted (structure placement, target count, difficulty). Procedural adds 2–3 weeks for tuning and validation. JSON is simple, debuggable, and allows rapid iteration. Revival trigger: if JSON authoring becomes a bottleneck (> 20 stages needed), or if procedural would enable infinite replayability as a new goal, revisit generation.

### Alternative 3: Rendering
**Option A — Canvas 2D (chosen):** 2D rasterized rendering.  
**Option B — WebGL or Three.js:** 3D graphics engine.  
**Rejection of B:** Angry Birds is 2D; WebGL adds build complexity (shader compilation, GLSL knowledge). 3D cameras and perspective are not needed. Canvas 2D is simpler to debug (no shader compilation), synchronizes naturally with physics ticks, and performs adequately on modern phones. Revival trigger: if performance drops below 30 FPS or if 3D parallax/effects become a hard requirement, migrate to Babylon.js or Pixijs.

### Alternative 4: Persistence
**Option A — localStorage (chosen):** Simple browser storage.  
**Option B — Server-side database:** Sync scores to a backend.  
**Rejection of B:** Backend adds complexity (auth, CORS, uptime). MVP assumes single-player offline play. localStorage is sufficient for progress tracking; data persists across sessions on the same browser/device. Revival trigger: if multiplayer leaderboards or cloud sync become a requirement, migrate to Firebase or a simple Node.js API.

**All rejected alternatives carry clear revival triggers.** If a trigger fires during implementation, the decision is re-opened.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Matter.js API changes between versions | Low | High (rewrite physics) | Pin to `^0.19.0` (semver-safe); test on 0.20.0 before upgrade |
| Canvas rendering performance degrades with 20+ bodies | Medium | Medium (framerate drops) | Implement object pooling; cull off-screen objects; profile with DevTools |
| Stage JSON loading fails (404, CORS) | Medium | High (game unplayable) | Embed all stage JSONs in HTML as fallback; implement retry with exponential backoff |
| Player saves corrupt (localStorage quota exceeded) | Low | Medium (progress lost) | Implement periodic backups to IndexedDB; cap save size < 50 KB |
| Slingshot trajectory prediction diverges from actual motion | Medium | Medium (player frustration) | Use same physics step/integration in prediction as in simulation; re-sync on launch |

## Assumptions (Each with "Impact if wrong")

- **Assumption 1:** Canvas 2D performance is sufficient for 20+ simultaneous physics bodies at 60 FPS.
  - *Impact if wrong:* Must migrate to Babylon.js or Pixi.js; 1–2 week delay; existing Canvas code is reusable but rendering layer must be rewritten.
- **Assumption 2:** Matter.js's constraint solver (for pinned/spring bodies) is stable and performant.
  - *Impact if wrong:* Complex structures (chains, pulleys) may jitter or oscillate; fallback is custom joint logic or simpler stage designs.
- **Assumption 3:** localStorage quota (5–10 MB) is sufficient for player progress + stage cache.
  - *Impact if wrong:* If stage JSONs are embedded (not fetched), total HTML size could exceed 500 KB; mitigate with gzip + lazy-load early stages only.
- **Assumption 4:** Player will close/refresh browser between play sessions (not keep tab open 24h).
  - *Impact if wrong:* Memory leaks in Canvas or physics engine would accumulate; mitigate with periodic garbage collection (reset scene every 2h gameplay).

## Definition of "Done"

The game is considered complete when **all of the following are true:**

1. **The load-bearing path closes:** A player can select a stage, launch the projectile, destroy all targets, and reach the clear state without the game crashing or freezing. The path must be verifiable in-browser (no console errors related to missing objects or failed collisions).

2. **All 10 stages are playable:** Each stage loads, has 1–3 targets and 4–8 structures, and clears when all targets are destroyed. A player can navigate from stage 1 to stage 10 sequentially or jump to any previously completed stage. (Verification: manual play-through; each stage reaches `CLEAR` state.)

3. **Physics are correct:** Projectiles fall due to gravity; structures fall when unsupported; collisions cause impulse and observable movement. (Verification: measure gravity constant matches Earth (9.8 m/s²) in world units; test one structure falling from height and confirm it settles; confirm collision causes at least 10 pixels of movement.)

4. **Pause button works:** Clicking the right-side pause button freezes gameplay (no new objects move) and shows an overlay with resume/menu options. Clicking resume resumes gameplay. (Verification: click pause, observe overlay, click resume, observe game continues where it left off.)

5. **Persistence works:** After completing stage 5, close the browser and reopen the game. The game shows stage 6 as accessible (or stage 5 as replay-able). (Verification: check `localStorage['playerProgress']` contains `highestStageUnlocked: 6`.)

6. **No required surface is missing:** The spec requires render, physics, stages, input, destruction, clear logic, pause UI, and persistence. None of these can be deferred or marked "out of scope" without explicit re-gate on scope change. (Verification: run the requirement × surface matrix again; mark each `build` cell as complete.)

**Measurable testable sentence:** "Run `npm test` (or manual play-through if no test harness) and confirm: (a) player launches projectile, (b) projectile hits structure, structure health decreases, (c) stage clears after all targets die, (d) pause button appears and overlay shows on click, (e) localStorage retains progress after page reload. If any step fails, the build is incomplete."

## Implementer Contract

**Rejected alternatives carry revival triggers:**
- Matter.js was chosen over custom physics (rejected) **if** bundle size > 200 KB minified OR runtime FPS < 60 with 20+ bodies OR API incompatibility blocks implementation, re-open and evaluate Planck.js.
- JSON stage format was chosen over procedural generation (rejected) **if** authoring 10 hand-crafted stages exceeds 2 person-weeks OR infinite replayability becomes a hard requirement, re-open and evaluate procedural generation.
- localStorage was chosen over server-side sync (rejected) **if** multiplayer or cloud-sync becomes a hard requirement, migrate to Firebase Realtime DB.

**Stack is pinned to versions that resolve:**
- `Matter.js@^0.19.0` — latest 0.19.x release is 0.19.0 (2022-07-30); 0.20.0 exists but breaking changes are possible; stay on 0.19.x until tested.
- `lodash@^4.17.21` — stable utility library; 4.17.21 is LTS-grade; no migration path needed for this scope.
- Canvas 2D — built-in HTML5 API; no version.
- localStorage — built-in browser API; no version.

**Any guarantee the stack is bought for, proved by command:**
- Matter.js is bought for **rigid-body physics + collision detection**: run `node -e "const Engine = require('matter-js').Engine; const e = Engine.create(); console.log(e.world ? 'OK' : 'FAIL');"` — exits 0 if engine initializes.
- Canvas 2D is bought for **2D rendering + performance**: run a manual 60 FPS test on a modern browser (Chrome 110+) with 20 bodies rendered; measure `requestAnimationFrame` callback delta-time < 16.7ms for ≥95% of frames. Verification: enable `performance.mark()` in the render loop; no frame should exceed 20ms (60 FPS = 16.67ms/frame).
- localStorage is bought for **persistence across session**: after `localStorage.setItem('test', 'ok')` and page reload, run `console.log(localStorage.getItem('test'))` — exits 0 (prints "ok") if working.

---

## Frame Deviations & Habit Regressions

**Section-by-section self-audit (opus-style requirement):**

### Weakest sections:
1. **"Collision & Destruction Rules"** — This section describes mechanics but does not pin a specific damage model (health decrements by velocity-squared? by contact impulse? by frame count?). A production plan would need a concrete formula. Mitigation: the verb requirement ("structure health decreases on impact") delegates the exact formula to implementation, but a reviewer should ask "does the implementer have enough to start, or is this still too vague?" Answer: it is vague; the cold-start table could include an `objectHealth` field and a `damagePerImpulse` coefficient to make it precise. Not included because the frame (spec-coverage) prioritizes breadth over depth; a second pass (fable-style) would pin these formulas.

2. **"Stage Data Structure"** — The difficulty curve (stages 1–3 simple, 4–7 medium, 8–10 hard) is stated narratively but not quantified. A production plan would define difficulty as a scalar (e.g., `difficulty: 1–10`) and map it to object count, spawn zones, and target health. Included a `"difficulty": 1` field but no escalation formula. Mitigation: the struct shows the field exists; implementer can derive the curve. Not fully prescriptive because opus-style favors adoptability (leave some room for creative interpretation) over control.

3. **"Alternatives & Rejection Rationale"** — Alternatives A and B are presented, but I did not deeply question whether a third alternative (e.g., Hybrid: Matter.js for bodies + custom constraints for performance-critical chains) exists. In a fable-style pass, this section would be adversarially audited ("did I miss a third way?"). Not included here because opus-style assumes reasonable alternatives are sufficient. Confession: I selected the candidates I expected the team to consider; a more thorough pass would solicit from the team whether other libraries/approaches are in-scope.

### Ascending-narrative regression:
The plan follows a natural "define architecture → design surfaces → define state machine → specify persistence" pipeline. This is not a regression; the steps flow from foundational (physics engine affects all rendering) to application (pause state depends on both game state and rendering). However, if a domain typically works in "persistence first, then state management", this ordering is a habit (bottom-up vs top-down). Not observed here; ascending narrative is appropriate.

### Coverage self-audit (fable-style discipline, applied here):
| Category | Included? | Why / Where |
|---|---|---|
| Regulatory/Legal | No | Not applicable (single-player game, no user data beyond scores) |
| Performance | Yes | "Canvas rendering performance…" risk, profiling mitigation, FPS targets in Done |
| Security | Minimal | localStorage has no auth; not a risk for offline game. If multiplayer were added, would need auth. Noted in revival triggers. |
| Testing | Partial | "Measurable testable sentence" and Done criteria include manual verification; no automated test suite specified. Production would add unit tests (collision, score logic) and E2E (full playthrough). Noted as future work. |
| Accessibility | No | Not specified (keyboard controls, screen reader support, colorblind palette). Impact: game is currently mouse-only. Addition: stage select could add keyboard arrow keys for stage navigation. Not included because initial prompt does not mention accessibility; re-scope if needed. |
| Offline-first | Yes | All stages embedded (option noted); localStorage persists offline. No server required. |
| Error handling | Partial | "Stage JSON loading fails" risk includes retry logic; missing: error UI (if JSON fails to load after retries, what does player see?). Would include error modal with retry button in production. Noted as a minor gap. |
| Slingshot physics tuning | Yes | Trajectory prediction, arc preview, drag-distance-to-impulse mapping mentioned; specific drag constant not pinned (e.g., impulse = drag.distance * 0.005). Noted as "implementer delegate"; production would pin this with A/B testing. |
| Stage difficulty curve | Partial | Escalation is stated (structure count, target count); difficulty is not quantified (e.g., "stage 10 must take 10–15 attempts for a casual player to clear"). Noted as an assumption; production would include playtesting metrics. |

**Items found in coverage audit:**
- **Accessibility** — not included; impact: game is mouse-only initially. Mitigation: add keyboard support (arrow keys for slingshot angle, space to launch) as a next feature.
- **Error UI** — not included; impact: if JSON fails to load, player sees a black screen or hangs. Mitigation: render an error modal with "Retry" and "Back" buttons; log to console.
- **Sound/Particles** — mentioned as optional ("visual feedback is mandatory, sound is not"); not detailed. Impact: game will ship without audio (acceptable for MVP). Mitigation: design sound assets list (launch sound, break sound, clear chime) for future release.

**Decisions I would attack if I were the reviewer:**
1. "Why Matter.js and not Rapier/Planck?" — Answer given (stability, API richness), but the bundle size comparison (Matter.js 0.19.0 is ~80 KB minified; Planck.js is ~60 KB) might tip the scales for a performance-constrained browser. A production plan would benchmark both.
2. "How do I tune the slingshot's drag-to-impulse coefficient?" — Answer: by playtesting and A/B testing. Recommendation: add a tunable constant and defer the number to implementation feedback.
3. "Are 10 hand-authored stages realistic in a 4-week sprint?" — Answer: probably not. Recommend 5–7 stages for MVP, then add 3 more in a second sprint. Not included because prompt says "10 stages", treated as hard requirement.

**Convention vs. frame:**
- The load-bearing path, cold-start table, and requirement matrix are frame-mandated (spec-coverage). No convention conflict.
- The state machine (MENU → LOADING → PLAYING → PAUSED → CLEAR) is common practice but not frame-mandated. Included because it clarifies behavior and is testable.
- Architecture choices (Matter.js, Canvas, localStorage) are standard for indie 2D games. Not novel; treated as canonical choices with clear revival triggers if they fail.

**No boilerplate in this confession:** Every item points to a specific section or gap.
