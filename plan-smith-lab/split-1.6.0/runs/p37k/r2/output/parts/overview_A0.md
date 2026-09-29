> plan-smith · part 1/7 · A0 · index: [plan.md](../plan.md)

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

> plan-smith · next: [coverage_A1.md](coverage_A1.md)
