// The 10 stages, declared as pure data. Layout is built with small "resting"
// helpers so every block/pig sits exactly on the ground (or on the piece below
// it), which keeps structures stable on load instead of collapsing.

import { GROUND_Y, StageData, BlockSpec, PigSpec, MaterialName } from './types';

const ANCHOR = { x: 200, y: 500 };

/** A block resting on the ground, or `up` pixels above it (for stacking). */
function blk(x: number, w: number, h: number, material: MaterialName, up = 0, angle = 0): BlockSpec {
  return { x, y: GROUND_Y - h / 2 - up, w, h, material, angle };
}

/** A pig resting on the ground, or `up` pixels above it. */
function pig(x: number, up = 0, r = 22, hp = 50): PigSpec {
  return { x, y: GROUND_Y - r - up, r, hp };
}

const SKY_DAY: [string, string] = ['#7ec8e3', '#dff3fb'];
const SKY_DUSK: [string, string] = ['#f6b17a', '#ffe6c7'];
const SKY_NIGHT: [string, string] = ['#3a4a6b', '#8090b5'];
const GROUND_GREEN = '#6aa84f';
const GROUND_SAND = '#cb9a5b';

export const STAGES: StageData[] = [
  // 1 — Tutorial: a lone pig, straight shot.
  {
    id: 1, name: '첫 발사', birds: 3, slingshot: ANCHOR,
    sky: SKY_DAY, ground: GROUND_GREEN,
    pigs: [pig(980)],
    blocks: [],
    starThresholds: [1000, 3000, 5000],
  },

  // 2 — A simple wooden shelter over one pig.
  {
    id: 2, name: '나무 오두막', birds: 3, slingshot: ANCHOR,
    sky: SKY_DAY, ground: GROUND_GREEN,
    pigs: [pig(1000)],
    blocks: [
      blk(930, 26, 120, 'wood'),
      blk(1070, 26, 120, 'wood'),
      blk(1000, 190, 24, 'wood', 120),
    ],
    starThresholds: [2000, 4000, 6000],
  },

  // 3 — Two pigs, each behind a pane of glass.
  {
    id: 3, name: '유리 방패', birds: 4, slingshot: ANCHOR,
    sky: SKY_DAY, ground: GROUND_GREEN,
    pigs: [pig(870), pig(1090)],
    blocks: [
      blk(805, 26, 100, 'glass'),
      blk(1025, 26, 100, 'glass'),
      blk(1090, 60, 20, 'wood', 100),
    ],
    starThresholds: [3000, 5000, 8000],
  },

  // 4 — Stacked tower: one pig at the base, one on the roof.
  {
    id: 4, name: '이층집', birds: 5, slingshot: ANCHOR,
    sky: SKY_DUSK, ground: GROUND_GREEN,
    pigs: [pig(1000), pig(1000, 144)],
    blocks: [
      blk(950, 26, 120, 'wood'),
      blk(1050, 26, 120, 'wood'),
      blk(1000, 150, 24, 'wood', 120),
      blk(860, 44, 72, 'stone'),
    ],
    starThresholds: [3500, 6000, 9000],
  },

  // 5 — Three pigs on a raised stone platform.
  {
    id: 5, name: '돌 발코니', birds: 5, slingshot: ANCHOR,
    sky: SKY_DUSK, ground: GROUND_SAND,
    pigs: [pig(900, 178), pig(1000, 178), pig(1100, 178)],
    blocks: [
      blk(850, 30, 150, 'stone'),
      blk(1150, 30, 150, 'stone'),
      blk(1000, 360, 28, 'stone', 150),
      blk(1000, 46, 46, 'glass'),
    ],
    starThresholds: [4000, 7000, 10000],
  },

  // 6 — Glass house with a lookout pig on the roof.
  {
    id: 6, name: '유리 저택', birds: 5, slingshot: ANCHOR,
    sky: SKY_DAY, ground: GROUND_GREEN,
    pigs: [pig(1000), pig(1000, 134)],
    blocks: [
      blk(920, 26, 110, 'glass'),
      blk(1080, 26, 110, 'glass'),
      blk(1000, 200, 24, 'wood', 110),
      blk(830, 26, 96, 'glass'),
    ],
    starThresholds: [4000, 7000, 10000],
  },

  // 7 — A tall wooden tower to topple, plus a ground pig.
  {
    id: 7, name: '흔들탑', birds: 6, slingshot: ANCHOR,
    sky: SKY_NIGHT, ground: GROUND_GREEN,
    pigs: [pig(880), pig(1000, 150)],
    blocks: [
      blk(1000, 90, 50, 'wood'),
      blk(1000, 90, 50, 'wood', 50),
      blk(1000, 90, 50, 'wood', 100),
      blk(820, 26, 90, 'glass'),
    ],
    starThresholds: [4500, 7500, 11000],
  },

  // 8 — Two separate strongholds, three pigs total.
  {
    id: 8, name: '쌍둥이 요새', birds: 6, slingshot: ANCHOR,
    sky: SKY_DUSK, ground: GROUND_SAND,
    pigs: [pig(780), pig(780, 134), pig(1080)],
    blocks: [
      // wooden hut on the left
      blk(740, 26, 110, 'wood'),
      blk(820, 26, 110, 'wood'),
      blk(780, 150, 24, 'wood', 110),
      // stone bunker on the right
      blk(1020, 28, 120, 'stone'),
      blk(1140, 28, 120, 'stone'),
      blk(1080, 170, 26, 'stone', 120),
    ],
    starThresholds: [5000, 8000, 12000],
  },

  // 9 — A stone fortress with glass weak points and pigs behind the wall.
  {
    id: 9, name: '돌 성채', birds: 7, slingshot: ANCHOR,
    sky: SKY_NIGHT, ground: GROUND_SAND,
    pigs: [pig(980), pig(1100), pig(1040, 168)],
    blocks: [
      blk(900, 30, 140, 'stone'),
      blk(1180, 30, 140, 'stone'),
      blk(1040, 340, 28, 'stone', 140),
      blk(1040, 26, 110, 'glass'),
      blk(820, 26, 100, 'glass'),
    ],
    starThresholds: [6000, 9000, 13000],
  },

  // 10 — Boss fortress: five pigs across a stacked mixed structure.
  {
    id: 10, name: '왕 돼지의 성', birds: 8, slingshot: ANCHOR,
    sky: SKY_NIGHT, ground: GROUND_SAND,
    pigs: [pig(760), pig(940, 88), pig(1060, 88), pig(1000, 212), pig(1180)],
    blocks: [
      // wide stone base platform
      blk(820, 40, 60, 'stone'),
      blk(1180, 40, 60, 'stone'),
      blk(1000, 420, 28, 'stone', 60),
      // wooden towers on the platform
      blk(880, 28, 100, 'wood', 88),
      blk(1120, 28, 100, 'wood', 88),
      blk(1000, 300, 24, 'wood', 188),
      // glass guards on the ground
      blk(700, 26, 96, 'glass'),
      blk(1240, 26, 96, 'glass'),
    ],
    starThresholds: [8000, 12000, 16000],
  },
];
