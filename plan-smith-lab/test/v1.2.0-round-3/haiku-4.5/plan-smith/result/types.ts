// Game state and physics types

export enum GameStateEnum {
    MENU = 'menu',
    PLAY = 'play',
    PAUSE = 'pause',
    CLEAR = 'clear',
    FAIL = 'fail'
}

export interface Bird {
    id: string;
    type: 'basic' | 'heavy' | 'fast';
    x: number;
    y: number;
    width: number;
    height: number;
    mass: number;
    velocity: { x: number; y: number };
    in_flight: boolean;
    body?: any; // Matter.js Body reference
}

export interface Block {
    id: string;
    type: 'wood' | 'glass' | 'concrete';
    x: number;
    y: number;
    width: number;
    height: number;
    health: number;
    max_health: number;
    restitution: number;
    body?: any; // Matter.js Body reference
    destroying: boolean;
    destroy_progress: number;
}

export interface Pig {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    health: number;
    body?: any; // Matter.js Body reference
}

export interface Stage {
    id: number;
    name: string;
    difficulty: number;
    birds_available: number;
    bird_types: ('basic' | 'heavy' | 'fast')[];
    blocks: Array<{
        id: string;
        type: 'wood' | 'glass' | 'concrete';
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
    pigs: Array<{
        id: string;
        x: number;
        y: number;
    }>;
    background_asset: string;
    star_thresholds: {
        three_stars: number;
        two_stars: number;
        one_star: number;
    };
}

export interface GameState {
    state: GameStateEnum;
    current_stage: number;
    birds_available: number;
    birds_used: number;
    birds_queue: Bird[];
    score: number;
    pigs: Pig[];
    blocks: Block[];
    in_flight_count: number;
    cleared_stages: number[];
    stage_scores: { [key: number]: { stars: number; score: number } };
}

export interface PhysicsState {
    paused: boolean;
    world?: any; // Matter.js World reference
    bodies: any[];
    gravity: number;
}

export interface InputState {
    pointer_down: boolean;
    pointer_x: number;
    pointer_y: number;
    drag_start_x: number;
    drag_start_y: number;
    dragging_slingshot: boolean;
}

export interface AudioState {
    muted: boolean;
    volume: number;
}

export interface EffectState {
    animations: Array<{
        id: string;
        type: 'destruction' | 'impact' | 'score';
        x: number;
        y: number;
        start_time: number;
        duration: number;
        progress: number;
    }>;
}

// Block properties by type
export const BLOCK_PROPERTIES: { [key: string]: { health: number; restitution: number } } = {
    'wood': { health: 1, restitution: 0.3 },
    'glass': { health: 2, restitution: 0.5 },
    'concrete': { health: 3, restitution: 0.2 }
};

// Bird properties by type
export const BIRD_PROPERTIES: { [key: string]: { mass: number; friction: number; restitution: number } } = {
    'basic': { mass: 1, friction: 0.01, restitution: 0.4 },
    'heavy': { mass: 2, friction: 0.02, restitution: 0.2 },
    'fast': { mass: 0.5, friction: 0.005, restitution: 0.6 }
};
