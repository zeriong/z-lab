// 스테이지 3 "유리 온실" — 유리 벽 + 나무 지붕 온실 2동. 새 요소: 파랑(분열, 유리 ×2), 유리
// 온실 A는 땅 위, 온실 B는 정적 받침(높이 100) 위에 있다.
// 풀이 1 (118.8,−16.7) 파랑: 낮고 평평한 궤적으로 A의 왼쪽 유리 벽(36스텝째 접촉, y≈767)을 깨고 돼지를 친다.
// 풀이 2 (111.2,−44.9) 파랑: A 위(y≈611)를 넘어 B의 왼쪽 유리 벽(54스텝째 접촉, y≈677)을 깨고 돼지를 친다.
// 풀이는 분열 없이도 성립하도록 잡았다(분열은 플레이어의 선택지). 파랑의 유리 ×2 배율 덕분에
// 벽을 깬 뒤에도 돼지를 제거할 속도가 남는다.
import { fairStars } from '../game/score';
import type { StageData } from '../types';

const base: Omit<StageData, 'stars'> = {
  id: 3,
  name: '유리 온실',
  birds: ['blue', 'blue', 'red'],
  statics: [{ x: 1350, y: 770, w: 240, h: 100 }], // x 1230–1470, 윗면 720
  blocks: [
    // 온실 A (땅)
    { kind: 'box', material: 'glass', x: 940, y: 780, w: 20, h: 80 },
    { kind: 'box', material: 'glass', x: 1060, y: 780, w: 20, h: 80 },
    { kind: 'box', material: 'wood', x: 1000, y: 730, w: 140, h: 20 },
    { kind: 'box', material: 'glass', x: 970, y: 700, w: 20, h: 40 },
    { kind: 'box', material: 'glass', x: 1030, y: 700, w: 20, h: 40 },
    // 온실 B (받침 위)
    { kind: 'box', material: 'glass', x: 1290, y: 680, w: 20, h: 80 },
    { kind: 'box', material: 'glass', x: 1410, y: 680, w: 20, h: 80 },
    { kind: 'box', material: 'wood', x: 1350, y: 630, w: 140, h: 20 },
    { kind: 'box', material: 'glass', x: 1320, y: 600, w: 20, h: 40 },
    { kind: 'box', material: 'glass', x: 1380, y: 600, w: 20, h: 40 },
  ],
  pigs: [
    { type: 'small', x: 1000, y: 800 },
    { type: 'small', x: 1350, y: 700 },
  ],
  slack: 1,
  solution: [{ pull: { x: 118.8, y: -16.7 } }, { pull: { x: 111.2, y: -44.9 } }],
};

export const stage03: StageData = { ...base, stars: fairStars(base) };
