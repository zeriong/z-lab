import type { StageDef } from '../types';
import { ice, pig, stone, terrain, wood } from '../stage-schema';

/** §6 #7 — 굴러가는 파편을 무기로 쓴다. 새 4 / 돼지 4 / 혼합 + 경사 지형 */
export const stage07: StageDef = {
  id: 7,
  name: '내리막',
  teaches: '굴러가는 파편을 무기로 쓴다',
  birds: ['basic', 'basic', 'dash', 'basic'],
  slingshot: { x: 190, y: 498 },
  terrain: [
    // 오른쪽 경사면 — 위에서 부순 파편이 왼쪽 아래로 굴러 내려온다
    terrain(1140, 615, 280, 40, -0.26),
  ],
  blocks: [
    stone(700, 590, 20, 100), // 얇은 돌 기둥 (직격을 한 번 막는다)
    wood(800, 590, 20, 100),
    wood(900, 590, 20, 100),
    wood(850, 530, 140, 20),
    ice(830, 500, 40, 40),
    ice(880, 500, 40, 40),
    ice(850, 470, 140, 20),
    stone(850, 440, 40, 40), // 무거운 돌 — 떨어지면 아래를 다 부순다
  ],
  pigs: [pig(850, 622), pig(960, 622), pig(1060, 622), pig(1200, 556)],
  parScore: 5900,
};
