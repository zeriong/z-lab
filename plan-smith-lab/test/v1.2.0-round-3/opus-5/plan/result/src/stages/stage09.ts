import type { StageData } from './schema';
import { merge, tower, hut, pyramid, box } from './prefabs';

const G = 620;
const LEDGE = 470; // 요새 2층 바닥면

const base = {
  blocks: [
    box('stone', 950, G - 75, 28, 150),
    box('stone', 1250, G - 75, 28, 150),
    box('stone', 1100, LEDGE + 15, 360, 30), // 2층 바닥(=천장)
  ],
  pigs: [],
};
const inside = hut(1100, G, { material: 'ice', pigInside: true, width: 120, height: 92 });
const upper = tower(1100, LEDGE, { floors: 2, material: 'ice', pigFloors: [0] });
const side = pyramid(1480, G, { rows: 3, material: 'stone', unit: 42, pigAtTop: true });
const t2 = hut(1650, G, { material: 'wood', pigInside: true });
const s = merge(base, inside, upper, side, t2);

// 의도: 1~2발째로 2층 얼음 구조를 무너뜨려 아래층 천장을 붕괴시키고, 3발째로 우측 피라미드.
export const stage09: StageData = {
  id: 9,
  name: '요새',
  world: { width: 1900, height: 720 },
  sling: { x: 220, y: 430 },
  birds: ['red', 'yellow', 'black', 'red', 'yellow'],
  ground: [{ x: 0, y: G, w: 1900, h: 100 }],
  blocks: [...s.blocks],
  pigs: [...s.pigs],
  starThresholds: [6500, 18000, 29000],
};
