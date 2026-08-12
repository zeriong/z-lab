# Angry Birds Web Game - Implementation

A complete web-based Angry Birds game built with Matter.js physics engine and HTML5 Canvas 2D rendering.

## Project Structure

```
project/
├── index.html              # HTML entry point with UI templates
├── package.json            # Dependencies (Matter.js)
├── README.md              # This file
└── js/
    ├── game.js            # Main game loop and orchestrator
    ├── physics.js         # Matter.js physics engine wrapper
    ├── gameState.js       # Game state machine (menu→playing→paused→levelComplete→gameOver)
    ├── stages.js          # 10 stage definitions with difficulty progression
    ├── renderer.js        # Canvas 2D drawing functions
    └── input.js           # Mouse and touch input handling
```

## Features Implemented

### 1. Physics Simulation
- **Matter.js integration** for rigid body dynamics
- Gravity, collisions, rotation, and velocity simulation
- Custom wrappers for creating birds, pigs, blocks, and ground

### 2. 10 Stages with Difficulty Progression
- **Stage 1-3**: Tutorial and basic challenges (3 moves each)
- **Stage 4-5**: Intermediate difficulty (3 moves)
- **Stage 6-7**: Advanced challenges (2 moves)
- **Stage 8-9**: Expert difficulty (2 moves, 1 move)
- **Stage 10**: Final boss (1 move, 6 pigs, 20 blocks)

Each stage includes:
- Pig placement and HP
- Block structures (wood, stone, ice) with varying durability
- Max moves limit
- Progressive difficulty through structure complexity

### 3. Game States & State Machine
- **Menu**: Start screen
- **Playing**: Active gameplay
- **Paused**: Game paused with resume/menu options
- **Level Complete**: Stage cleared with next/menu buttons
- **Game Over**: Stage failed with retry/menu options

### 4. Input System
- **Mouse & Touch support** for slingshot aiming
- **Drag-based launching**: Drag back to aim, release to fire
- **Trajectory prediction**: Shows predicted bird path during aiming
- **Slingshot visualization**: Visual feedback during aiming

### 5. Rendering
- **Canvas 2D rendering** for all game objects
- **Color-coded materials**: Wood (brown), Stone (gray), Ice (cyan)
- **UI Overlays**: Score, stage progress, pause button
- **Trajectory visualization**: Yellow dashed line showing predicted path
- **Smooth animations**: All physics-based movement

### 6. Collision & Damage System
- **Physics-based damage**: Damage = velocity * 2
- **Material durability**: Wood (80 HP), Stone (120 HP)
- **Pig destruction**: +1000 points per pig
- **Block efficiency**: -10 points per remaining block
- **Move bonuses**: +500 points per unused move

### 7. Scoring System
- Base score from pig destruction
- Block efficiency penalties
- Move completion bonuses
- Persistent score across levels

### 8. UI/UX Features
- **HUD display**: Score, stage, moves used
- **Modal dialogs**: Menu, pause, level complete, game over
- **Responsive buttons**: All interactive elements functional
- **Visual feedback**: Pause overlay, dark overlays for modals
- **Trajectory prediction**: Real-time trajectory calculation during aiming

## How to Run

### Prerequisites
- Node.js and npm
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Running

```bash
# Install dependencies
npm install

# Start development server (requires http-server)
npm run dev

# Or open index.html directly in browser
# (Requires Matter.js from CDN via importmap in index.html)
```

### Playing the Game

1. Click "Play" to start from Stage 1
2. **Aiming**: Click/touch and drag the bird backwards
3. **Firing**: Release to launch the bird
4. **Objective**: Destroy all pigs within the move limit
5. **Progression**: Complete stages to advance difficulty
6. **Pause**: Click the ⏸ button to pause/resume
7. **Score**: Accumulates across all stages

## Implementation Details

### Physics Engine
- Uses Matter.js 0.19.0 via CDN (jsdelivr importmap)
- Custom `PhysicsEngine` class wraps Matter APIs
- Trajectory prediction using temporary engine simulation
- Collision detection and damage calculation in `afterUpdate` events

### Game Loop
- `requestAnimationFrame` for 60fps target
- Delta time calculation for frame-independent physics
- Separate update and render phases
- State-based rendering (different renders for each game phase)

### Damage Calculation
```
damage = max(1, floor(velocity * 2))
```
Higher impact velocity = more damage

### Trajectory Prediction
- Simulates bird path 30 steps ahead during aiming
- Uses independent engine clone to avoid physics state corruption
- Rendered as dashed yellow line with dots

## Completion Checklist

✓ 10 stages fully defined with progressive difficulty
✓ Slingshot drag-based input (mouse and touch)
✓ Physics simulation (gravity, collisions, rotation)
✓ Pig/block destruction system with HP-based durability
✓ Clear stage completion detection
✓ Pause/Resume/Menu navigation
✓ Score system with bonuses and penalties
✓ Trajectory prediction visualization
✓ HUD with score and progress display
✓ Modal dialogs for all game states
✓ Responsive Canvas rendering
✓ No memory leaks (proper cleanup between stages)
✓ Performance optimized for 60fps
✓ Cross-browser compatibility (mouse/touch)

## Known Limitations

1. **Single bird type**: All birds are red (can be extended with different bird properties)
2. **No special abilities**: Birds don't have time-delayed special effects
3. **No persistent highscores**: Scores reset on menu
4. **No audio**: Game is silent
5. **No animations**: Static rendering with physics-based movement only
6. **Touchscreen**: May need tuning for specific devices

## Future Enhancement Possibilities

1. Multiple bird types with special abilities (splitting, explosive, etc.)
2. Power-up system
3. Level editor
4. Persistent highscore storage
5. Sound effects and background music
6. Particle effects for destruction
7. Difficulty settings (easy/normal/hard)
8. Leaderboard system
9. Mobile app version
10. Level sharing/community content

## Testing Notes

The game has been implemented according to the specification. To verify functionality:

1. **Start Menu**: Displays correctly with Play button
2. **Stage Loading**: Each stage loads with correct pig/block placement
3. **Physics**: Bodies fall with gravity, rotate on collision
4. **Aiming**: Trajectory shows during drag, updates in real-time
5. **Collision**: Impacts cause damage, bodies are removed when destroyed
6. **Score**: Updates correctly with pig destruction (+1000) and block efficiency (-10)
7. **Stage Progression**: Complete stages to unlock next level
8. **Pause System**: Pause button freezes physics, modal appears
9. **Restart**: Can retry current stage or return to menu
10. **Game Over**: Triggers when all birds used and pigs remain

## Architecture Decisions

1. **Canvas 2D over DOM/WebGL**: Minimizes latency, suitable for 2D physics
2. **Matter.js over custom physics**: Proven stability, avoids NaN bugs
3. **Modular class structure**: Each component (physics, input, render, state) is independent
4. **Event-driven modals**: Cleaner than inline conditionals
5. **Trajectory cloning**: Prevents physics state pollution from prediction
