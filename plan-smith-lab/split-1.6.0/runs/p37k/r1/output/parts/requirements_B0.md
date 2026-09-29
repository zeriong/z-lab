> plan-smith · part 3/7 · B0 · index: [plan.md](../plan.md)

## Requirements & detailed behaviors

Each `build` requirement, stated as observable behavior:

1. **10 stages authored with difficulty progression:** When the game loads, the developer can add a new stage JSON object to the stages config (pigs array, blocks array, birds allotted) and the game loads and plays it. Absence shows as: no way to add stages; hardcoded stage 1 only; or stages do not progress.

2. **Slingshot drag and release launches a bird:** When the user presses the pointer in the slingshot zone, dragging updates a trajectory preview arc. On release, the bird body receives an impulse matching drag distance and angle. Absence shows as: no trajectory preview; bird does not move; bird moves but ignores drag delta.

3. **Pause button on right side halts physics without losing state:** When the user clicks the pause button (positioned right of HUD), the physics engine stops stepping and all bodies retain their position/velocity. Resuming restarts physics at the same state. Absence shows as: button off-screen or overlapped by game canvas; game state resets; projectile falls through the floor; or physics restarts at a different state.

4. **Block destruction removes block and animates it:** When a bird or projectile collides with a block and damage exceeds the block's health, the block animates destruction (crumble sprite or fade, 0.5s duration) and is removed from the game state. Absence shows as: block persists despite collision; collision is silent; or destroyed blocks leave invisible hit boxes.

5. **Pig collision or block-on-pig removes pig:** When a bird or block (knocked loose by another collision) collides with a pig body, the pig is removed from the game state and its sprite is hidden. Absence shows as: pig persists despite impact; or pig and bird both remain, blocking clear.

6. **Stage clear fires when all pigs removed and no projectiles in flight:** After each physics step, the game checks: `pigs.length === 0 AND in_flight_projectiles === 0`. If true, game state transitions to "clear" and displays the next-stage overlay. Absence shows as: stage never clears even after all pigs killed; or clear fires while bird is still in flight.

7. **Restart button resets stage to initial state:** When the user clicks "Restart" in the pause overlay, the current stage resets: all blocks and pigs respawn at their stage-JSON positions; bird count resets to stage allotment; score for this stage resets; game state returns to "play". Absence shows as: blocks persist from previous attempt; bird count decrements across restarts; or restart transitions to menu instead of replay.

8. **Return-to-menu transitions to main menu with game reset:** When the user clicks "Return to Menu" in the pause overlay, the game state resets to "menu" and the main menu renders with "Play" button. No stage state is preserved (save progress is separate, via persistence layer). Absence shows as: game state stays "play"; menu does not appear; or previous stage partially loads.

9. **Score calculation and display on stage clear:** When a stage clears, the game calculates score: e.g., 3 stars if birds_used ≤ 2; 2 stars if birds_used ≤ 4; 1 star if birds_used ≤ allotment. Score persists to localStorage. Score is rendered in HUD during play and in post-clear overlay. Absence shows as: no score display; score does not persist across reopen; or star count is non-deterministic.

10. **Background and stage theming:** Each stage JSON includes a `background_asset` (image path), and the renderer draws this behind the gameplay area. Absence shows as: all stages share one background; or background fails to load and blocks rendering.

11. **Slingshot release and impact audio:** When the user releases the slingshot, a "twang" sound plays. When a bird collides with a block, an impact thud plays. When a pig is removed, a distinct "death" sound plays. Pause mutes all game sounds (not UI). Absence shows as: no sounds; sounds play during pause; or slingshot sound plays before launch.

12. **Destruction particle effects or animation:** When a block is destroyed, it animates over 0.5s (either sprite-sheet animation of crumbling or particle burst effect). The animation completes before the block is fully removed from the game state. Absence shows as: block disappears instantly; animation plays but block remains solid; or animation is longer than 1s (breaks flow).

13. **Block type variation and material properties:** The stage JSON defines blocks with types (wood, glass, concrete, etc.); each type has different health (wood=1, glass=2, concrete=3) and restitution (elasticity on collision). Collision damage is proportional to impact force, capped per block type. Absence shows as: all blocks have identical health; or restitution is uniform and unrealistic.

14. **In-game HUD displays stage name, bird count, and score:** During play, the HUD renders (top or side) showing: current stage name/number, birds remaining (e.g., "3/5"), and score. Updates live as birds are used and blocks are destroyed. Absence shows as: HUD is blank or missing; numbers do not update; or HUD overlaps the slingshot zone.

15. **Bird type variation (basic, heavy, fast, etc.):** Stages 1–3 introduce bird types: basic (standard mass/size), heavy (high mass, low speed), fast (low mass, high speed). Each type has different matter.Body properties (mass, friction, restitution). Stage data specifies which bird type is available in each stage. Absence shows as: all birds are identical; or bird type doesn't affect physics.

16. **Pause overlay with resume, restart, menu buttons:** When the user clicks pause, a semi-transparent overlay appears with three buttons: Resume (continues play), Restart (resets stage), Return to Menu (goes to main menu). Buttons are ≥40px × 40px and clearly labeled. Absence shows as: pause has no overlay; buttons are too small; or buttons do not call the correct handlers.

17. **LocalStorage persistence of cleared stages and progress:** On stage clear, the game saves to localStorage: cleared_stages array (stage numbers), current_stage (for resume on next session), high_score_per_stage. On app load, if saved progress exists, the main menu or stage selector reflects completed stages. Absence shows as: progress is not saved; or saving breaks on quota (no pruning logic).

18. **Phase 0: Thin slice (menu → stage 1 → play → slingshot → collision → pig removed → clear):** Before moving to content and polish, the game must support: load menu, play stage 1, fire slingshot, collide, destroy blocks, remove pig, clear stage. This path must work end-to-end without scripting or manual intervention. Absence shows as: any step in the chain is non-functional; or clear is not checked.

---

> plan-smith · next: [steps_C0.md](steps_C0.md)
