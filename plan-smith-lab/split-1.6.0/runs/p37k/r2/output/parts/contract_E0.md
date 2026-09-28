> plan-smith · part 7/7 · E0 · index: [plan.md](../plan.md)

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

> plan-smith · next: end of plan
