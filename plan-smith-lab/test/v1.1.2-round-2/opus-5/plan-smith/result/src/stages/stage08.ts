import type { StageDef } from '../types';
import { ice, pig, stone, wood } from '../stage-schema';

/** §6 #8 — 자원 배분: 새 4마리를 두 목표에 나눈다. 새 4 / 돼지 4 / 좌우 분리 2탑 */
export const stage08: StageDef = {
  id: 8,
  name: '두 개의 탑',
  teaches: '자원 배분 — 새 4마리를 두 목표에 나눈다',
  birds: ['basic', 'basic', 'dash', 'basic'],
  slingshot: { x: 190, y: 498 },
  terrain: [],
  blocks: [
    // 왼쪽 탑 (나무 — 싸게 무너진다)
    wood(760, 590, 20, 100),
    wood(860, 590, 20, 100),
    wood(810, 530, 140, 20),
    ice(810, 500, 40, 40),
    // 오른쪽 탑 (돌 지지대 — 대시가 필요하다)
    stone(1060, 590, 20, 100),
    stone(1160, 590, 20, 100),
    wood(1110, 530, 140, 20),
    ice(1110, 500, 40, 40),
  ],
  pigs: [pig(810, 622), pig(960, 622), pig(1110, 622), pig(1110, 462)],
  parScore: 5900,
};
