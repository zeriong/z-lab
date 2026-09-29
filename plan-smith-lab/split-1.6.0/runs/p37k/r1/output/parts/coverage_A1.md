> plan-smith · part 2/7 · A1 · index: [plan.md](../plan.md)

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

> plan-smith · next: [requirements_B0.md](requirements_B0.md)
