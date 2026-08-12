/**
 * Values that must be identical everywhere. Plan §1.2 / §2.2:
 * the logical resolution is fixed so physics tuning never depends on the
 * window size, and the simulation always advances with the same dt.
 */

export const LOGICAL_WIDTH = 1280;
export const LOGICAL_HEIGHT = 720;

/** Fixed physics timestep (60 Hz). Never pass a variable dt to the engine. */
export const STEP_MS = 1000 / 60;

/** Frame time clamp — prevents the death spiral after a tab returns (§2.2). */
export const MAX_FRAME_MS = 100;

/** Bonus per unused bird when a stage is cleared (§6.5). */
export const BIRD_BONUS = 10000;

export const STORAGE_KEY = 'slingshot-birds:v1';
