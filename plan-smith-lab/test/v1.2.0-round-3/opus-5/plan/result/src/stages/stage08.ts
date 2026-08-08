import type { StageData } from './schema';
import { merge, tower, hut, box, pig } from './prefabs';

const G = 620;
const bunker = {
  blocks: [
    box('stone', 900, G - 62, 26, 124),
    box('stone', 1120, G - 62, 26, 124),
    box('stone', 1010, G - 134, 260, 24),
    box('stone', 1010, G - 200, 26, 108),
  ],
  pigs: [pig(960, G - 19), pig(1065, G - 19)],
};
const t = tower(1300, G, { floors: 2, material: 'stone', pigFloors: [0] });
const h = hut(1480, G, { material: 'wood', pigInside: true });
const s = merge(bunker, t, h);

// 의도: black을 벙커 내부로 굴려넣고 탭 폭발 → stone 벙커 붕괴 + 돼지 2마리 동시 처치.
export const stage08: StageData = {
  id: 8,
  name: '폭탄',
  world: { width: 1700, height: 720 },
  sling: { x: 220, y: 430 },
  birds: ['red', 'black', 'red'],
  ground: [{ x: 0, y: G, w: 1700, h: 100 }],
  blocks: [...s.blocks],
  pigs: [...s.pigs],
  starThresholds: [5500, 16500, 27000],
  hint: '검은 새는 탭하거나 충돌 후 잠시 뒤 폭발합니다.',
};
