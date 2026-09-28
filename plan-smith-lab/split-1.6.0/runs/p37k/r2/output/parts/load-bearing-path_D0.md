> plan-smith · part 6/7 · D0 · index: [plan.md](../plan.md)

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

> plan-smith · next: [contract_E0.md](contract_E0.md)
