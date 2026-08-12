# Slingshot Birds

Browser physics slingshot game, 10 stages. Implementation of `plan.md`
(TypeScript + Vite + Canvas 2D, `matter-js` as the only runtime dependency).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production bundle
```

Dev URL flags: `?unlockAll=1` (unlock every stage), `?debug=1` (physics
outlines, live flight trail, counters — also toggled with the `` ` `` key).

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Aim / fire | drag the bird, release | same (touch) |
| Cancel a shot | drag back onto the anchor (< 10px) | same |
| Ability (speed / bomb) | click during flight | tap during flight |
| Scout the level | drag empty space to pan | same |
| Pause | pause button (top right), `Esc` / `P` | pause button (56x56) |

## Layout

```
src/
  main.ts              boot
  core/                Game (root controller), Loop (fixed timestep),
                       StateMachine, Input, Camera, Storage, constants, math
  physics/             PhysicsWorld (the only matter-js import),
                       materials (single tuning table), collisionRules
  game/                Level (round flow + damage), Slingshot, Trajectory,
                       Score, Settle, entities/{Bird,Pig,Block,Ground,Entity}
  render/              Renderer (letterbox + layers), shapes, Particles,
                       DebugRender
  ui/                  Screens, HUD, PauseOverlay  (DOM over the canvas)
  data/                levelSchema (types + runtime validation),
                       levels/level01..10.json
  audio/               Sfx (WebAudio blips, no assets)
```

## Invariants worth keeping

- **Fixed 1280x720 logical space, fixed 1/60 s step.** Launch power and break
  thresholds are tuned against these; a variable dt would make the same shot
  behave differently on a 144 Hz screen.
- **Matter.js stays inside `physics/`.** Game code only sees `PhysicsWorld`.
  That is the escape hatch to Planck.js if stacks turn out to be unstable.
- **Trajectory prediction uses the engine's discrete integration**, not the
  closed-form parabola — air friction makes the analytic curve drift.
- **Bodies are removed on the fixedUpdate boundary**, never inside a collision
  callback.
- **Restart rebuilds the whole world** (`Level.dispose()` + a new
  `PhysicsWorld`). There is no partial reset path on purpose.
- **Level JSON uses bottom-center coordinates** for blocks and pigs; the loader
  converts to body centres and warns about initial overlaps.

## Status

Written from the plan without executing anything: no install, no build, no
browser run, no play-testing. Milestones M0–M7 of the plan are implemented in
code; the plan's verification gates (60 fps measurement, 20x restart leak
check, "all 10 stages proven clearable", mobile device pass) have **not** been
performed, and the physics/material numbers in `physics/materials.ts` plus the
star thresholds in the level files are first-draft values that expect tuning.
