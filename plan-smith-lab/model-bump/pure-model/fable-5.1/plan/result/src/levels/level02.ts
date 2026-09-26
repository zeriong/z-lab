/** 2. 나무 오두막 — 나무 hut 1개, 안에 돼지. 구조물 파괴. */
import { aim } from '../gameplay/Ballistics';
import { GROUND, HUT_HALF_SPAN, hut } from './builders';
import type { LevelDef } from './types';

const HUT_X = 850;
/** 왼쪽 기둥의 왼쪽 면 x */
const LEFT_FACE = HUT_X - HUT_HALF_SPAN.medium - 10;

export const level02: LevelDef = {
  id: 2,
  name: '나무 오두막',
  birds: ['red', 'red', 'red'],
  star2: 13000,
  star3: 21000,
  entities: [...hut(HUT_X, GROUND, 'wood', 'medium')],
  solutionShots: [
    // 낮은 각도 고속 샷으로 왼쪽 기둥을 부수고 그대로 돼지까지 간다
    aim({ x: LEFT_FACE, y: 622 }, 15),
    aim({ x: LEFT_FACE, y: 622 }, 15),
    // 오두막이 열렸으면 돼지 직격
    aim({ x: HUT_X, y: 640 }, 45),
  ],
};
