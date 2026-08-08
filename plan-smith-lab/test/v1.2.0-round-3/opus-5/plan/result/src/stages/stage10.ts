import type { StageData } from './schema';
import { merge, tower, hut, bridge, pyramid, box } from './prefabs';

const G = 620;
const HILL = 545;

const a = hut(900, G, { material: 'wood', pigInside: true });
const b = pyramid(1150, G, { rows: 4, material: 'ice', unit: 40, pigAtTop: true });
const c = bridge(1420, G, { span: 300, pillars: 3, material: 'wood', pigsOnTop: 1 });
const d = tower(2050, HILL, { floors: 3, material: 'stone', pigFloors: [0, 2] });
const wall = { blocks: [box('stone', 1880, HILL - 90, 30, 180)], pigs: [] };
const e = hut(2450, HILL, { material: 'stone', roofMaterial: 'wood', pigInside: false });
const s = merge(a, b, c, wall, d, e);

// 의도: 1~2발째 근거리 목조/얼음 정리 → yellow 가속으로 stone 방벽 관통 → black 폭발로 언덕 위 탑 붕괴.
export const stage10: StageData = {
  id: 10,
  name: '최후',
  world: { width: 3200, height: 720 },
  sling: { x: 220, y: 430 },
  birds: ['red', 'yellow', 'red', 'black', 'yellow'],
  ground: [
    { x: 0, y: G, w: 1750, h: 100 },
    { x: 1750, y: HILL, w: 1450, h: 175 },
  ],
  blocks: [...s.blocks],
  pigs: [...s.pigs],
  starThresholds: [8000, 20000, 32000],
};
