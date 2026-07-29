// Shared tuning constants. Grouped by concern so stage design / physics /
// input can each be adjusted independently without touching other modules.

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

export const DEFAULT_SLINGSHOT_ANCHOR = { x: 150, y: 380 };

// --- Slingshot input / trajectory preview ---
export const GRAB_RADIUS = 70; // px around the waiting bird that starts a drag
export const MAX_PULL_RADIUS = 95; // max distance the bird can be dragged from the anchor
export const LAUNCH_FORCE_SCALE = 0.18; // pull distance (px) -> launch velocity (px/step)

// Trajectory preview is a cheap "shadow simulation" (plain stepwise Euler
// integration, not a real Matter.js sub-step) so it never touches real
// bodies. TRAJECTORY_GRAVITY approximates Matter's own per-step velocity
// gain under default gravity (gravity.y=1, gravity.scale=0.001) so the
// dotted preview roughly tracks the real flight; it will not match exactly.
export const TRAJECTORY_GRAVITY = 0.28;
export const TRAJECTORY_POINTS = 45;

// --- Turn resolution ---
export const REST_VELOCITY_THRESHOLD = 0.05; // Matter body.speed considered "at rest"
export const REST_WAIT_MS = 800; // how long a body must stay below threshold before the turn ends
export const MAX_TURN_WAIT_MS = 6000; // hard cap so a never-settling body can't stall the game forever

// --- Particles ---
export const PARTICLE_LIFETIME = 40; // frames

// --- Collision / destruction ---
export const DAMAGE_THRESHOLD = 2.5; // relative-velocity impact below this does no damage to blocks
export const DAMAGE_MULTIPLIER = 14;
export const PIG_IMPACT_THRESHOLD = 2;
export const PIG_DAMAGE_MULTIPLIER = 22;
export const EXPLOSION_RADIUS = 140;
export const EXPLOSION_FORCE = 0.4;
export const EXPLOSION_DAMAGE = 40;

// --- Materials (block strength / feel) ---
export const MATERIALS = {
  wood: { density: 0.004, restitution: 0.15, friction: 0.6, health: 42 },
  stone: { density: 0.009, restitution: 0.05, friction: 0.8, health: 95 },
  glass: { density: 0.0025, restitution: 0.25, friction: 0.3, health: 16 },
};

// --- Bird types (plan requires 2+ kinds to give the slingshot strategy) ---
export const BIRD_TYPES = {
  normal: { radius: 18, density: 0.008, restitution: 0.35, color: '#e74c3c' },
  bomb: { radius: 20, density: 0.012, restitution: 0.15, color: '#2c3e50' },
};

export const PIG_RADIUS = 20;
export const PIG_HEALTH = 26;
