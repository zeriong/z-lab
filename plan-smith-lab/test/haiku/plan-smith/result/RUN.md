# Angry Birds Game - Run Instructions

## Stack
- **Rendering**: Canvas 2D
- **Physics Engine**: Matter.js v2 (locally vendored)
- **Build System**: None (plain HTML + JavaScript)
- **Runtime**: Modern browser (Chrome, Firefox, Safari)

## Build Command
No build step required. All files are served as-is.

## Static Serving Directory
Root directory (`.`) - index.html is at the root of result/

## How to Play
1. Open `index.html` in a web browser or serve via HTTP (e.g., `python3 -m http.server`)
2. Select a stage from the main menu (1-10)
3. **Controls**:
   - **Aim & Shoot**: Click and drag on the slingshot (left side) to aim, then release to fire
   - **Pause**: Click the PAUSE button in the top-right during gameplay
   - From pause menu: Resume, Retry current stage, or return to Main Menu
4. **Goal**: Eliminate all pigs on the stage by hitting them with the projectile or destroying structures on top of them
5. **Clear Condition**: All pigs must be removed and the world must be stable (no moving objects) for ~2 seconds
6. **Progression**: Stages 1-10 increase in difficulty with more pigs and complex structures

## Technical Notes
- Physics simulation runs at fixed 60Hz timestep in the render loop
- Trajectory prediction shown as dashed line while aiming
- Pause freezes physics but allows rendering (visual feedback)
- Retry reloads stage from initial data (deterministic reset)
- No network calls required - Matter.js is vendored locally
