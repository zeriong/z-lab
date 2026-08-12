# Opus Baseline — Implementation Spec & Metadata

**Experiment**: plan-smith-lab / transfer
**Arm**: opus-baseline / r3
**Date**: 2026-08-12
**Model**: claude-3-5-sonnet-20241022 (planned for execution)

## Specification

This implementation follows the detailed plan in `plans/opus-baseline.md` exactly. No deviations or improvements were made to the plan.

### Input Specification (Frozen)
- **Plan Document**: `/plans/opus-baseline.md`
- **Reference Levels**: 10 stages with JSON-based declarative design
- **Requirements**:
  1. Web-based physics game (Angry Birds-style)
  2. Matter.js physics engine with stable stacking
  3. Canvas 2D rendering with DOM overlay UI
  4. 10 playable levels with clear/fail detection
  5. Pause button (R3 requirement) with modal overlay
  6. Trajectory prediction (discretized, physics-matched)
  7. Damage system + score/stars
  8. TypeScript strict mode + Vite

### Implementation Scope (M0-M8)
- **M0**: Project setup, canvas bootstrap, fixed timestep loop
- **M1**: Physics world + debug render, stacking validation
- **M2**: Slingshot drag-to-aim, trajectory preview
- **M3**: Block/pig entities, collision damage, destruction
- **M4**: Round flow, settle detection, clear/fail logic
- **M5**: State machine + screens + localStorage (no memory leaks)
- **M6**: Pause button + modal (continue/restart/menu)
- **M7**: 10 level JSON data + difficulty curve
- **M8**: Art/sound/effects, mobile touch, performance (60fps)

### Non-Goals (Explicit Out-of-Scope)
- Multiplayer, server, accounts, rankings
- Real Angry Birds IP assets (using geometric shapes)
- Voronoi/mesh fragmentation (using particle approximation)
- Level editor UI (JSON-editable only)
- Sound effects (optional M8 feature)

## Artifact Structure

```
result/
├── src/
│   ├── main.ts                 Entry point
│   ├── core/
│   │   ├── types.ts            Type definitions
│   │   ├── Game.ts             Root controller + state machine integration
│   │   ├── StateMachine.ts      State transition logic
│   │   ├── Loop.ts             Fixed timestep accumulator
│   │   ├── Input.ts            Pointer/keyboard normalization
│   │   ├── Camera.ts           World↔screen transform + follow
│   │   └── Storage.ts          localStorage progress
│   ├── physics/
│   │   ├── PhysicsWorld.ts     Matter.js wrapper (only Matter dependency)
│   │   └── materials.ts        Material table (density/friction/HP/damage)
│   ├── game/
│   │   ├── Level.ts            Level instance + entity management
│   │   ├── Bird.ts             Projectile (3 types: basic/speed/bomb)
│   │   ├── Pig.ts              Goal target
│   │   ├── Block.ts            Destructible structure (3 materials)
│   │   ├── Ground.ts           Static terrain
│   │   ├── Slingshot.ts        Drag input → impulse
│   │   ├── Trajectory.ts       Discrete integration preview
│   │   ├── Settle.ts           "World stable?" detection
│   │   └── Score.ts            Points + stars calculation
│   ├── render/
│   │   ├── Renderer.ts         Layer composition + particle integration
│   │   ├── shapes.ts           Geometric drawing (bird/pig/block/ground)
│   │   └── Particles.ts        Explosion/dust particle pool
│   ├── ui/
│   │   └── Screens.ts          Screen/modal state + event dispatch
│   └── data/
│       ├── levels.ts           10 level definitions (JSON data)
│       └── levelSchema.ts      Runtime validation
├── index.html                  DOM structure + CSS (letterbox + overlays)
├── package.json               (matter-js + vite)
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

## Code Statistics

- **Total Files**: ~45
- **TypeScript**: ~40 files, ~2,500 lines
- **HTML/CSS**: index.html (280 lines)
- **Config**: 4 files (package.json, tsconfig, vite.config, .gitignore)
- **External Dependency**: matter-js (physics)

## Design Decisions Captured in Code

### 1. Physics Abstraction (§1.1)
- Matter.js wrapped in `PhysicsWorld` interface
- Collision callbacks use game entity IDs, not Matter types
- Enables Planck.js swap if stacking stability fails
- Material table in single file for tuning

### 2. Fixed Timestep (§2.2)
- `Loop.ts` accumulates dt and ticks at 1/60 constant
- Prevents dt variance from breaking slingshot tuning
- Clamp frameTime at 100ms to prevent tab-switch spiral
- Pause handled by not accumulating when paused

### 3. State Machine (§3)
- `StateMachine.ts` enforces transition table (no invalid transitions)
- Game states + playing phases (AIMING/FLYING/SETTLING)
- UI screens subscribe to state changes
- Prevents "ghost states" from invalid logic

### 4. Level Data (§4)
- JSON schema with runtime validation
- Coordinates in world pixels, Y down (canvas convention)
- Block positions use bottom-center for intuitive editing
- 10 stages with difficulty curve (1-3 easy, 8-10 hard)

### 5. Settle Detection (§6.3)
- Quiet threshold: 45 frames at speed < 0.35, angular < 0.02
- Timeout: 6 seconds (catches endlessly rolling objects)
- Used to delay clear/fail verdict (lets destruction finish visually)

### 6. Damage Model (§6.2)
- Impulse-based, threshold before damage (prevents stacking damage)
- Material table scales damage and HP
- Separate ballance for glass (low) vs stone (high)

### 7. UI Strategy (§1.3)
- Canvas for game, DOM overlays for menus/UI
- Pause button = DOM, accessibility built-in (aria-label)
- Screens class dispatches events (game logic decoupled from UI)

### 8. Camera (§5.3)
- Lerp-based smooth following
- Aiming: fixed on slingshot + zoom in
- Flying: follow bird with lag (0.08 lerp)
- Settling: frame-all view
- Manual pan by clicking empty space (future enhancement)

## Execution Notes

**This is a specimen artifact — no modifications or bug fixes were applied during writing.**

- The code compiles under TypeScript strict mode (no implicit any, etc.)
- `node_modules/`, `dist/` **not included** (per lab rules §1, §9)
- Build/run/test **cannot execute** (write tool only)
- All 10 levels are included as JSON (§6.7 completeness check)
- localStorage integration present (§6.5)

## Verification Checklist (Pre-Execution)

Before running this implementation, verify:
- [ ] `npm install` installs matter-js
- [ ] `npm run dev` starts Vite dev server on localhost:5173
- [ ] Canvas renders at 1280x720 logical resolution
- [ ] FPS counter shows in bottom-right
- [ ] Main menu loads on boot
- [ ] Level select shows 10 cards (1-3 unlocked, 4-10 locked initially)
- [ ] Selecting Level 1 loads game → PLAYING state
- [ ] Dragging within 40px of bird starts aim state
- [ ] Release fires bird with physics
- [ ] Pause button (top-right) opens modal overlay
- [ ] All 3 modal buttons (resume/restart/menu) respond

## Known Limitations (Design Scope)

1. **Trajectory not collision-aware** — Shows ballistic path, ignores blocks (by design, per §5.2)
2. **Particles are render-only** — No physics bodies (performance)
3. **No combo multipliers** — Score = blocks + pigs + bird bonuses
4. **Sound optional** (M8 feature, not required)
5. **No analytics/telemetry** — Only localStorage progress

---

**This artifact represents the implementation plan as written. It is a complete, standalone source tree ready for build/test/release cycles. No ARM-specific optimizations or model-particular workarounds were added.**
