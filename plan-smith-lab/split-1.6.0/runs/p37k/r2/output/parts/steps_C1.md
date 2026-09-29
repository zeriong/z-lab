> plan-smith · part 5/7 · C1 · index: [plan.md](../plan.md)

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

> plan-smith · next: [load-bearing-path_D0.md](load-bearing-path_D0.md)
