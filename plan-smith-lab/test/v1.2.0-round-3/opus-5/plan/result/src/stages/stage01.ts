import type { StageData } from './schema';
import { hut } from './prefabs';

const G = 620;
const a = hut(880, G, { material: 'wood', pigInside: true });

// 의도: 1발째 오두막 좌측 벽 하단을 맞혀 지붕이 안쪽으로 무너지며 돼지 압사.
export const stage01: StageData = {
  id: 1,
  name: '첫 발사',
  world: { width: 1280, height: 720 },
  sling: { x: 220, y: 430 },
  birds: ['red', 'red', 'red'],
  ground: [{ x: 0, y: G, w: 1280, h: 100 }],
  blocks: [...a.blocks],
  pigs: [...a.pigs],
  starThresholds: [1000, 11000, 21000],
  hint: '새를 잡고 뒤로 당겼다 놓으세요. 우측 상단 ‖ 버튼으로 일시정지.',
};
