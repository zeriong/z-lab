import type { StageData } from './schema';
import { merge, tower, hut } from './prefabs';

const G = 620;
const t = tower(900, G, { floors: 3, material: 'wood', pigFloors: [0] });
const h = hut(1090, G, { material: 'wood', pigInside: true });
const s = merge(t, h);

// 의도: 1발째 탑 1층 좌측 기둥 → 탑 전체가 우측으로 넘어가며 오두막까지 연쇄 붕괴.
export const stage02: StageData = {
  id: 2,
  name: '무너지는 탑',
  world: { width: 1280, height: 720 },
  sling: { x: 220, y: 430 },
  birds: ['red', 'red', 'red'],
  ground: [{ x: 0, y: G, w: 1280, h: 100 }],
  blocks: [...s.blocks],
  pigs: [...s.pigs],
  starThresholds: [2000, 12500, 22500],
};
