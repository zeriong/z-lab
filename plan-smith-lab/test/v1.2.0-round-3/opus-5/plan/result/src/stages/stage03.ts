import type { StageData } from './schema';
import { merge, hut, pyramid } from './prefabs';

const G = 620;
const p = pyramid(880, G, { rows: 3, material: 'ice', unit: 42, pigAtTop: true });
const h = hut(1105, G, { material: 'wood', roofMaterial: 'ice', pigInside: true });
const s = merge(p, h);

// 의도: 1발째 얼음 피라미드 하단 중앙 — ice는 임계가 낮아 한 방에 관통되며 상단 돼지가 낙하.
export const stage03: StageData = {
  id: 3,
  name: '얼음집',
  world: { width: 1280, height: 720 },
  sling: { x: 220, y: 430 },
  birds: ['red', 'red', 'red'],
  ground: [{ x: 0, y: G, w: 1280, h: 100 }],
  blocks: [...s.blocks],
  pigs: [...s.pigs],
  starThresholds: [2500, 13000, 23000],
};
