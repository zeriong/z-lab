# RUN

1. **Stack:** Vanilla JS + HTML5 Canvas 2D, physics by **Matter.js 0.20.0** (vendored at `vendor/matter.min.js`). No framework, no build tooling, client-only static files.
2. **Build command:** `none` (nothing to compile — plain `<script>` tags).
3. **Servable static directory:** `.` (this `result/` folder; `index.html` is at its root).
4. **Controls:** Drag back from the bird on the slingshot to aim (dotted line previews the arc), release to fire; the ⏸ button on the top-right pauses (다시하기 / 메인으로).

## Serve locally
```
cd result
python3 -m http.server 8000
# open http://localhost:8000/
```
Any static file server works (must be http, not file://, so the classic scripts load).

## Layout
- `index.html` — canvas, HUD (pause button on the right), and the menu / pause / clear / fail overlays.
- `js/core.js` — pure simulation (Matter world loader, collision-damage, clear/fail judging, discrete-step trajectory solver). Runs in the browser **and** in Node, so the exact play code is head-less-verifiable.
- `js/stages.js` — the 10 stages as pure data (`window.STAGES`). Adding a stage touches only this file.
- `js/game.js` — presentation: FSM (MENU → PLAYING → PAUSED → CLEARED/FAILED), Canvas rendering, pointer slingshot input.
- `vendor/matter.min.js` — vendored physics engine.

## Verification performed
- All **10 stages auto-clear** within their bird budget (head-less greedy player over the real `core.js`).
- **Idempotent reset:** three reloads of a stage produce an identical body set (same count and positions) — no leaked bodies.
- **Trajectory preview** matches actual flight to 0.00 px (discrete-step replay of the integrator).
- In-browser: real drag-gesture fires a bird, a hit destroys a pig → CLEARED overlay; pause → 다시하기/메인으로; restart re-initializes the stage; FAIL triggers when birds run out with pigs remaining.

## Debug hook (optional)
`window.__game` exposes `loadStage(n)`, `pigCount()`, `bodyCount()`, `birdsLeft()`, `verifyStage(n)`, `verifyAll()` for scripted checks.
