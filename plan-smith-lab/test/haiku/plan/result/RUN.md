# Angry Birds Game - Build & Deployment Guide

## Stack
- **Rendering**: Canvas 2D
- **Physics Engine**: Matter.js (v0.19.0)
- **Build Tool**: Vite (v5.0.0)
- **Language**: Vanilla JavaScript (ES modules)

## Build Command
```bash
npm install && npm run build
```

## Servable Directory
`dist/` (relative to project root)

## Controls
**Mouse Drag:** Click and drag backward on the bird at the slingshot to aim, then release to fire. Drag distance is limited to 150px. In-game pause button (upper right) pauses the game and shows menu options (Resume/Retry/Main Menu).

## How to Run Locally (for development)
```bash
npm run dev
# Server runs at http://localhost:5173
```

## How to Serve Statically
After building, serve the `dist/` directory:
```bash
# Using Python 3
python -m http.server 8000 --directory dist

# Using Node.js http-server
npx http-server dist

# Using other static servers (nginx, Apache, etc.)
# Point root to /path/to/dist/ and serve index.html for all routes
```

## Game Overview
- **10 Stages**: Data-driven level layouts in stages.json
- **Physics-based Gameplay**: Slingshot mechanics, gravity, collision detection, structure destruction
- **State Machine**: Menu → Stage Select → In-Game → Pause/Result → Menu
- **Features**:
  - Pause button in top-right (visible during gameplay)
  - Pause overlay with Resume/Retry/Main Menu buttons
  - Score tracking
  - Auto-clear detection (all pigs removed = victory)
  - Game over detection (all birds used, pigs remain = defeat)
  - Result screen with score display and next stage option
