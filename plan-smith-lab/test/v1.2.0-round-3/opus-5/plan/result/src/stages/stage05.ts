import type { StageData } from './schema';
import { merge, tower, hut, pyramid } from './prefabs';

const G = 620;
const HILL = 540; // 우측 언덕 상단면
const a = hut(880, G, { material: 'wood', pigInside: true });
const b = tower(1290, HILL, { floors: 2, material: 'wood', pigFloors: [0] });
const c = pyramid(1500, HILL, { rows: 3, material: 'ice', unit: 40, pigAtTop: true });
const s = merge(a, b, c);

// 의도: 1발째 낮은 궤도로 좌측 오두막, 2~3발째 높은 궤도로 언덕 위 탑을 언덕 아래로 밀어냄.
export const stage05: StageData = {
  id: 5,
  name: '두 언덕',
  world: { width: 1600, height: 720 },
  sling: { x: 220, y: 430 },
  birds: ['red', 'red', 'red', 'red'],
  ground: [
    { x: 0, y: G, w: 1120, h: 100 },
    { x: 1120, y: HILL, w: 480, h: 180 },
  ],
  blocks: [...s.blocks],
  pigs: [...s.pigs],
  starThresholds: [4000, 15000, 25000],
};
