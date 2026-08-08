import type { StageData } from './schema';
import { merge, tower, hut, box } from './prefabs';

const G = 620;
const shield = { blocks: [box('stone', 800, G - 110, 28, 220)], pigs: [] };
const t = tower(980, G, { floors: 3, material: 'wood', pigFloors: [0, 2] });
const h = hut(1180, G, { material: 'stone', roofMaterial: 'wood', pigInside: true });
const s = merge(shield, t, h);

// 의도: yellow를 발사 후 돌벽 직전에 탭 → 가속으로 stone 방패를 뚫고 탑 기둥 파괴.
export const stage06: StageData = {
  id: 6,
  name: '노란 새',
  world: { width: 1400, height: 720 },
  sling: { x: 220, y: 430 },
  birds: ['red', 'yellow', 'red', 'yellow', 'red'],
  ground: [{ x: 0, y: G, w: 1400, h: 100 }],
  blocks: [...s.blocks],
  pigs: [...s.pigs],
  starThresholds: [4500, 15500, 26000],
  hint: '노란 새는 비행 중 화면을 탭하면 가속합니다.',
};
