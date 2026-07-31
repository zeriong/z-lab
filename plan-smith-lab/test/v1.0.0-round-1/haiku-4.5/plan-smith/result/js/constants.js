// Game Constants

export const GAME_WIDTH = 1200;
export const GAME_HEIGHT = 700;
export const FIXED_TIMESTEP = 1 / 60; // 60 Hz fixed timestep
export const MAX_ACCUMULATOR = 0.1; // Maximum accumulator to prevent spiral of death

// Physics
export const GRAVITY = 0.001; // Gravity acceleration
export const COLLISION_FORCE_THRESHOLD = 10; // Force threshold to remove pig
export const STRUCTURE_DAMAGE_THRESHOLD = 15; // Force threshold to remove structure

// Slingshot
export const SLINGSHOT_MAX_DISTANCE = 200; // Max drag distance
export const SLINGSHOT_FORCE_MULTIPLIER = 0.005; // Convert drag distance to force
export const TRAJECTORY_POINTS = 100; // Number of points in trajectory prediction

// Game States
export const STATE = {
    MAIN_MENU: 'main_menu',
    LOADING: 'loading',
    PLAYING: 'playing',
    PAUSED: 'paused',
    CLEAR: 'clear',
    GAME_OVER: 'game_over'
};

// Entity Types
export const ENTITY_TYPE = {
    BIRD: 'bird',
    PIG: 'pig',
    WOOD_BLOCK: 'wood_block',
    STONE_BLOCK: 'stone_block',
    ICE_BLOCK: 'ice_block',
    GROUND: 'ground',
    STRUCTURE: 'structure'
};

// Camera
export const DEFAULT_CAMERA = {
    x: 0,
    y: 0,
    zoom: 1
};

// Time
export const STAGE_CLEAR_STABILITY_TIME = 2000; // 2 seconds of stability before clear
export const LAUNCH_COOLDOWN_TIME = 1000; // 1 second before next launch
export const MAX_STAGE_TIME = 120000; // 120 seconds per stage (ms)
