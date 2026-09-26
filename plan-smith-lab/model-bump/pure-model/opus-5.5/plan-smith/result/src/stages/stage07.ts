// 스테이지 7 "벙커" — 지붕까지 돌로 덮인 벙커. 새 요소: 검정(폭탄)
// 벙커 = 돌 벽 20×40 둘 + 돌 지붕 160×20. 벙커 1 안에는 소형 돼지가 숨어 있어 직격이 불가능하고,
// 폭발(반경 140, 소형은 d < 112면 제거)로만 잡을 수 있다. 대형 돼지는 지붕 위.
// 풀이 1 (117.3,−24.9) 검정: 37스텝째 대형 돼지 1 직격(데미지 ≈34 > 15) → 같은 스텝에 폭발,
//   폭발 지점 ≈(945,725)에서 벙커 안 소형 돼지(1000,800)까지 d≈93 → 데미지 ≈10 > 6.
// 풀이 2 (112.7,−41.0) 검정: 벙커 1 위(y≈640)를 넘어 55스텝째 대형 돼지 2 직격(≈34).
import { fairStars } from '../game/score';
import type { BlockDef, StageData } from '../types';

function bunker(cx: number): BlockDef[] {
  return [
    { kind: 'box', material: 'stone', x: cx - 70, y: 800, w: 20, h: 40 },
    { kind: 'box', material: 'stone', x: cx + 70, y: 800, w: 20, h: 40 },
    { kind: 'box', material: 'stone', x: cx, y: 770, w: 160, h: 20 },
    { kind: 'box', material: 'stone', x: cx - 110, y: 800, w: 40, h: 40 },
    { kind: 'box', material: 'stone', x: cx + 110, y: 800, w: 40, h: 40 },
  ];
}

const base: Omit<StageData, 'stars'> = {
  id: 7,
  name: '벙커',
  birds: ['black', 'black', 'red'],
  blocks: [
    ...bunker(1000),
    ...bunker(1350),
    { kind: 'box', material: 'glass', x: 1350, y: 800, w: 40, h: 40 }, // 벙커 2 안의 유리 상자
  ],
  pigs: [
    { type: 'large', x: 1000, y: 730 },
    { type: 'small', x: 1000, y: 800 },
    { type: 'large', x: 1350, y: 730 },
  ],
  slack: 1,
  solution: [
    { pull: { x: 117.3, y: -24.9 }, abilityAtStep: 37 },
    { pull: { x: 112.7, y: -41.0 } },
  ],
};

export const stage07: StageData = { ...base, stars: fairStars(base) };
