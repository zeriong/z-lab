import type { StageData } from './schema';
import { merge, box, hut } from './prefabs';

const G = 620;
// 돌벽: red 한 발로는 안 깨진다. 벽 위를 넘겨 뒤쪽 오두막을 노리거나 벽을 밀어 넘어뜨린다.
const wall = {
  blocks: [
    box('stone', 820, G - 60, 26, 120),
    box('stone', 820, G - 180, 26, 120),
    box('stone', 860, G - 60, 26, 120),
    box('stone', 860, G - 180, 26, 120),
  ],
  pigs: [],
};
const h1 = hut(1000, G, { material: 'wood', pigInside: true });
const h2 = hut(1150, G, { material: 'wood', pigInside: true });
const s = merge(wall, h1, h2);

// 의도: 높은 각도로 벽을 넘겨 1발째 좌측 오두막, 2발째로 우측 오두막.
export const stage04: StageData = {
  id: 4,
  name: '돌벽',
  world: { width: 1280, height: 720 },
  sling: { x: 220, y: 430 },
  birds: ['red', 'red', 'red', 'red'],
  ground: [{ x: 0, y: G, w: 1280, h: 100 }],
  blocks: [...s.blocks],
  pigs: [...s.pigs],
  starThresholds: [3000, 13500, 23500],
};
