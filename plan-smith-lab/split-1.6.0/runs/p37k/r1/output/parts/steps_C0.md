> plan-smith · part 4/7 · C0 · index: [plan.md](../plan.md)

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

> plan-smith · next: [steps_C1.md](steps_C1.md)
