/**
 * Stage data — data-driven layer (plan Step 0 / Step 4).
 * Every stage is a plain data object: pigs + blocks + bird budget.
 * No stage-specific code exists anywhere else in the codebase; the
 * engine only ever consumes this schema, so adding/editing a stage
 * never touches engine code.
 *
 * Coordinate system: canvas pixels, origin top-left, ground surface
 * at GAME_CONSTANTS.GROUND_Y. Block/pig y is the body CENTER.
 */

window.GAME_CONSTANTS = {
  CANVAS_W: 960,
  CANVAS_H: 540,
  GROUND_Y: 500,      // y of the ground's top surface
  SLING_X: 150,       // slingshot pivot
  SLING_Y: 380,
  PIG_R: 18,
  BIRD_R: 20
};

window.STAGES = [
  { // 1 — tutorial: single low tower, one pig
    id: 1, name: '스테이지 1', birdCount: 4,
    pigs: [ { x: 680, y: 372, r: 18 } ],
    blocks: [
      { x: 650, y: 455, w: 20, h: 90, angle: 0, material: 'wood' },
      { x: 710, y: 455, w: 20, h: 90, angle: 0, material: 'wood' },
      { x: 680, y: 400, w: 90, h: 20, angle: 0, material: 'wood' }
    ]
  },
  { // 2 — taller single tower, one pig
    id: 2, name: '스테이지 2', birdCount: 3,
    pigs: [ { x: 680, y: 312, r: 18 } ],
    blocks: [
      { x: 650, y: 450, w: 20, h: 100, angle: 0, material: 'wood' },
      { x: 710, y: 450, w: 20, h: 100, angle: 0, material: 'wood' },
      { x: 680, y: 390, w: 90, h: 20, angle: 0, material: 'wood' },
      { x: 680, y: 355, w: 50, h: 50, angle: 0, material: 'wood' }
    ]
  },
  { // 3 — two simple towers, two pigs
    id: 3, name: '스테이지 3', birdCount: 4,
    pigs: [ { x: 560, y: 382, r: 18 }, { x: 780, y: 382, r: 18 } ],
    blocks: [
      { x: 530, y: 460, w: 20, h: 80, angle: 0, material: 'wood' },
      { x: 590, y: 460, w: 20, h: 80, angle: 0, material: 'wood' },
      { x: 560, y: 410, w: 90, h: 20, angle: 0, material: 'wood' },
      { x: 750, y: 460, w: 20, h: 80, angle: 0, material: 'wood' },
      { x: 810, y: 460, w: 20, h: 80, angle: 0, material: 'wood' },
      { x: 780, y: 410, w: 90, h: 20, angle: 0, material: 'wood' }
    ]
  },
  { // 4 — wood-columned bridge sheltering two pigs
    id: 4, name: '스테이지 4', birdCount: 4,
    pigs: [ { x: 650, y: 482, r: 18 }, { x: 730, y: 482, r: 18 } ],
    blocks: [
      { x: 620, y: 465, w: 24, h: 70, angle: 0, material: 'wood' },
      { x: 760, y: 465, w: 24, h: 70, angle: 0, material: 'wood' },
      { x: 690, y: 420, w: 180, h: 20, angle: 0, material: 'wood' }
    ]
  },
  { // 5 — stone fortress, tougher walls, two pigs
    id: 5, name: '스테이지 5', birdCount: 4,
    pigs: [ { x: 680, y: 482, r: 18 }, { x: 730, y: 482, r: 18 } ],
    blocks: [
      { x: 650, y: 455, w: 24, h: 90, angle: 0, material: 'stone' },
      { x: 760, y: 455, w: 24, h: 90, angle: 0, material: 'stone' },
      { x: 705, y: 400, w: 150, h: 20, angle: 0, material: 'wood' }
    ]
  },
  { // 6 — three towers in a row, three pigs
    id: 6, name: '스테이지 6', birdCount: 5,
    pigs: [
      { x: 520, y: 392, r: 18 },
      { x: 700, y: 392, r: 18 },
      { x: 880, y: 392, r: 18 }
    ],
    blocks: [
      { x: 490, y: 465, w: 20, h: 70, angle: 0, material: 'wood' },
      { x: 550, y: 465, w: 20, h: 70, angle: 0, material: 'wood' },
      { x: 520, y: 420, w: 80, h: 20, angle: 0, material: 'wood' },
      { x: 670, y: 465, w: 20, h: 70, angle: 0, material: 'wood' },
      { x: 730, y: 465, w: 20, h: 70, angle: 0, material: 'wood' },
      { x: 700, y: 420, w: 80, h: 20, angle: 0, material: 'wood' },
      { x: 850, y: 465, w: 20, h: 70, angle: 0, material: 'wood' },
      { x: 910, y: 465, w: 20, h: 70, angle: 0, material: 'wood' },
      { x: 880, y: 420, w: 80, h: 20, angle: 0, material: 'wood' }
    ]
  },
  { // 7 — slippery ice platform + separate ice pedestal, three pigs
    id: 7, name: '스테이지 7', birdCount: 5,
    pigs: [
      { x: 660, y: 372, r: 18 },
      { x: 720, y: 372, r: 18 },
      { x: 820, y: 442, r: 18 }
    ],
    blocks: [
      { x: 650, y: 455, w: 20, h: 90, angle: 0, material: 'ice' },
      { x: 730, y: 455, w: 20, h: 90, angle: 0, material: 'ice' },
      { x: 690, y: 400, w: 100, h: 20, angle: 0, material: 'ice' },
      { x: 820, y: 480, w: 40, h: 40, angle: 0, material: 'ice' }
    ]
  },
  { // 8 — stone base platform with a wood tower on top, three pigs
    id: 8, name: '스테이지 8', birdCount: 5,
    pigs: [
      { x: 610, y: 452, r: 18 },
      { x: 790, y: 452, r: 18 },
      { x: 700, y: 372, r: 18 }
    ],
    blocks: [
      { x: 700, y: 485, w: 200, h: 30, angle: 0, material: 'stone' },
      { x: 650, y: 440, w: 20, h: 60, angle: 0, material: 'wood' },
      { x: 750, y: 440, w: 20, h: 60, angle: 0, material: 'wood' },
      { x: 700, y: 400, w: 130, h: 20, angle: 0, material: 'wood' }
    ]
  },
  { // 9 — multi-chamber fortress with side ledges, four pigs
    id: 9, name: '스테이지 9', birdCount: 6,
    pigs: [
      { x: 670, y: 482, r: 18 },
      { x: 750, y: 482, r: 18 },
      { x: 560, y: 452, r: 18 },
      { x: 860, y: 452, r: 18 }
    ],
    blocks: [
      { x: 630, y: 445, w: 26, h: 110, angle: 0, material: 'stone' },
      { x: 790, y: 445, w: 26, h: 110, angle: 0, material: 'stone' },
      { x: 710, y: 378, w: 200, h: 24, angle: 0, material: 'wood' },
      { x: 560, y: 470, w: 60, h: 30, angle: 0, material: 'stone' },
      { x: 860, y: 470, w: 60, h: 30, angle: 0, material: 'stone' }
    ]
  },
  { // 10 — final: ice tower + stone/wood chamber + stone tower + ledge, five pigs
    id: 10, name: '스테이지 10', birdCount: 7,
    pigs: [
      { x: 510, y: 382, r: 18 },
      { x: 690, y: 482, r: 18 },
      { x: 750, y: 482, r: 18 },
      { x: 890, y: 362, r: 18 },
      { x: 830, y: 458, r: 18 }
    ],
    blocks: [
      // left ice tower
      { x: 480, y: 460, w: 20, h: 80, angle: 0, material: 'ice' },
      { x: 540, y: 460, w: 20, h: 80, angle: 0, material: 'ice' },
      { x: 510, y: 410, w: 80, h: 20, angle: 0, material: 'ice' },
      // center stone/wood chamber
      { x: 650, y: 440, w: 26, h: 120, angle: 0, material: 'stone' },
      { x: 790, y: 440, w: 26, h: 120, angle: 0, material: 'stone' },
      { x: 720, y: 356, w: 180, h: 24, angle: 0, material: 'wood' },
      // right stone tower with wood cap
      { x: 890, y: 450, w: 40, h: 100, angle: 0, material: 'stone' },
      { x: 890, y: 390, w: 60, h: 20, angle: 0, material: 'wood' },
      // exposed ledge
      { x: 830, y: 488, w: 50, h: 24, angle: 0, material: 'stone' }
    ]
  }
];
