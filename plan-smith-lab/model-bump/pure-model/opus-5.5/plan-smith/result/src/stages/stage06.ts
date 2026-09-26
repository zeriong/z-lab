// 스테이지 6 "쉬어가기 피라미드" — 나무·유리 피라미드. 새 요소 없음 (난이도 골짜기, 여유 2)
// 꼭대기 판(윗면 592) 위에 소형 돼지 셋이 간격 10으로 한 줄로 서 있다.
// 풀이 (107.8,−52.5) 빨강: 궤적 꼭짓점(x≈860, y≈558)의 거의 수평 구간이 돼지 줄을 스치며
// 셋을 차례로 친다. 빨강(6.08)이 소형 돼지(1.26)보다 훨씬 무거워 부딪힐 때마다 조금만 느려진다
// (§4.5 식: 28.6 → 21.7 → 15.6, 모두 HP 6 초과). 두 유리 기둥이 "핵심 블록"이라 맞히면 판이 무너진다.
import { fairStars } from '../game/score';
import type { StageData } from '../types';

const base: Omit<StageData, 'stars'> = {
  id: 6,
  name: '쉬어가기 피라미드',
  birds: ['red', 'blue', 'yellow'],
  blocks: [
    // 1단: 나무 기둥 셋 + 나무 판 (윗면 710)
    { kind: 'box', material: 'wood', x: 880, y: 775, w: 20, h: 90 },
    { kind: 'box', material: 'wood', x: 950, y: 775, w: 20, h: 90 },
    { kind: 'box', material: 'wood', x: 1020, y: 775, w: 20, h: 90 },
    { kind: 'box', material: 'wood', x: 950, y: 720, w: 200, h: 20 },
    // 2단: 유리 기둥 둘(핵심 블록) + 가운데 유리 블록 + 나무 판 (윗면 592)
    { kind: 'box', material: 'glass', x: 900, y: 661, w: 20, h: 98 },
    { kind: 'box', material: 'glass', x: 1000, y: 661, w: 20, h: 98 },
    { kind: 'box', material: 'glass', x: 950, y: 690, w: 40, h: 40 },
    { kind: 'box', material: 'wood', x: 950, y: 602, w: 160, h: 20 },
    // 피라미드 발
    { kind: 'box', material: 'wood', x: 830, y: 800, w: 40, h: 40 },
    { kind: 'box', material: 'wood', x: 1070, y: 800, w: 40, h: 40 },
  ],
  pigs: [
    { type: 'small', x: 900, y: 572 },
    { type: 'small', x: 950, y: 572 },
    { type: 'small', x: 1000, y: 572 },
  ],
  slack: 2,
  solution: [{ pull: { x: 107.8, y: -52.5 } }],
};

export const stage06: StageData = { ...base, stars: fairStars(base) };
