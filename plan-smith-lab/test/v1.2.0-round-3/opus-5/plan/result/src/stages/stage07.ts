import type { StageData } from './schema';
import { merge, bridge, hut } from './prefabs';

const G = 620;
const br = bridge(820, G, { span: 300, pillars: 3, material: 'wood', pigsOnTop: 2 });
const h = hut(1250, G, { material: 'wood', pigInside: true });
const s = merge(br, h);

// 의도: 1발째 다리 중앙 지지대 → 상판이 꺼지며 위의 돼지 2마리가 낙사. 2발째 우측 오두막.
export const stage07: StageData = {
  id: 7,
  name: '다리',
  world: { width: 1500, height: 720 },
  sling: { x: 220, y: 430 },
  birds: ['red', 'yellow', 'red', 'red'],
  ground: [{ x: 0, y: G, w: 1500, h: 100 }],
  blocks: [...s.blocks],
  pigs: [...s.pigs],
  starThresholds: [5000, 16000, 26500],
};
