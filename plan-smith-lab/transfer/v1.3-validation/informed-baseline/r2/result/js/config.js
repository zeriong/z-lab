(function() {
  window.AB = window.AB || {};

  window.AB.C = {
    // Screen & Time
    W: 1280,
    H: 720,
    GROUND_Y: 600,
    FIXED_DT: 16.667,
    MAX_SUBSTEPS: 5,
    MAX_FRAME_MS: 100,

    // Slingshot & Launch
    SLING: {
      x: 180,
      y: 470,
      forkBottom: 600
    },
    GRAB_R: 70,
    DRAG_MAX: 110,
    DRAG_MIN: 12,
    LAUNCH_K: 0.2,
    SPEED_MAX: 22,

    // Gravity & Trajectory
    GRAVITY_STEP: 0.2778,
    TRAJ_DOTS: 30,
    TRAJ_STEP: 4,

    // Materials (Blocks)
    MATERIALS: {
      wood: {
        density: 0.0025,
        restitution: 0.05,
        friction: 0.60,
        hp: 55,
        fillColor: '#c98b44',
        strokeColor: '#8a5a24'
      },
      ice: {
        density: 0.0018,
        restitution: 0.10,
        friction: 0.20,
        hp: 28,
        fillColor: '#9fd8ee',
        strokeColor: '#5aa8c8',
        alpha: 0.75
      },
      stone: {
        density: 0.0055,
        restitution: 0.02,
        friction: 0.70,
        hp: 140,
        fillColor: '#9aa0a6',
        strokeColor: '#5f656b'
      }
    },
    SCORE_BLOCK: 500,

    // Birds
    BIRDS: {
      red: {
        radius: 14,
        density: 0.010,
        restitution: 0.35,
        friction: 0.6,
        frictionAir: 0,
        color: '#e0402e'
      },
      yellow: {
        radius: 12,
        density: 0.008,
        restitution: 0.30,
        friction: 0.6,
        frictionAir: 0,
        color: '#f2c230'
      },
      black: {
        radius: 15,
        density: 0.014,
        restitution: 0.20,
        friction: 0.6,
        frictionAir: 0,
        color: '#3a3a40'
      }
    },
    DASH_MUL: 1.6,
    DASH_MAX: 34,
    BLAST_R: 130,
    BLAST_DMG: 90,
    BLAST_IMPULSE: 0.036,

    // Pigs
    PIGS: {
      small: {
        radius: 18,
        density: 0.0022,
        restitution: 0.25,
        friction: 0.6,
        hp: 24,
        score: 5000
      },
      big: {
        radius: 28,
        density: 0.0022,
        restitution: 0.25,
        friction: 0.6,
        hp: 60,
        score: 7000
      }
    },

    // Damage & Score & Timers
    IMPACT_MIN: 4,
    DMG_SCALE: 2.2,
    BIRD_BONUS: 2.5,
    SCORE_BIRD_LEFT: 10000,
    SETTLE_SPEED: 0.6,
    SETTLE_MS: 1000,
    SHOT_TIMEOUT_MS: 8000,
    NEXT_BIRD_MS: 900,
    CLEAR_DELAY_MS: 800,
    OUT_MARGIN: 150,

    // Other
    STORAGE_KEY: 'ab_progress_v1',
    LEVEL_COUNT: 10
  };
})();
