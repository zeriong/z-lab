// 스테이지 4 "두꺼운 벽" — 돼지 앞에 두께 30 나무 벽 2겹. 새 요소: 노랑(가속, 나무 ×2)
// 요새 = 받침 위의 [벽1 30×100][벽2 30×100][돼지][기둥 20×100] + 지붕 130×20.
// 보정 근거(§4.5 식): 가속한 노랑(속도 40)은 벽1(88)·벽2(≈41)을 부수고 돼지(≈10 > 6)까지 닿는다.
// 가속하지 않은 노랑은 벽2 뒤 돼지에게 5.4, 빨강은 벽2에 12.6(< HP 20)만 줘서 뚫지 못한다.
// 풀이 1 (118.1,−20.8) 노랑, 14스텝째(궤적 꼭짓점) 가속 → 거의 수평(40,−0.1)으로 요새 A 벽1(y≈698)에 꽂힌다.
// 풀이 2 (108.7,−50.7) 노랑, 34스텝째(꼭짓점) 가속 → 요새 A 지붕 위(y≈570)를 지나 높은 받침 위 요새 B 벽1(y≈586).
import { fairStars } from '../game/score';
import type { BlockDef, StageData, StaticDef } from '../types';

/** F = 벽1 왼쪽 면 x, top = 받침 윗면 y */
function fort(F: number, top: number): { blocks: BlockDef[]; plinth: StaticDef } {
  const wallY = top - 50;
  return {
    plinth: { x: F + 60, y: (top + 820) / 2, w: 180, h: 820 - top },
    blocks: [
      { kind: 'box', material: 'wood', x: F + 15, y: wallY, w: 30, h: 100 },
      { kind: 'box', material: 'wood', x: F + 45, y: wallY, w: 30, h: 100 },
      { kind: 'box', material: 'wood', x: F + 120, y: wallY, w: 20, h: 100 },
      { kind: 'box', material: 'wood', x: F + 65, y: top - 110, w: 130, h: 20 },
    ],
  };
}

const A = fort(950, 740);
const B = fort(1330, 624);

const base: Omit<StageData, 'stars'> = {
  id: 4,
  name: '두꺼운 벽',
  birds: ['yellow', 'yellow', 'red'],
  statics: [A.plinth, B.plinth],
  blocks: [...A.blocks, ...B.blocks],
  pigs: [
    { type: 'small', x: 1030, y: 720 },
    { type: 'small', x: 1410, y: 604 },
  ],
  slack: 1,
  solution: [
    { pull: { x: 118.1, y: -20.8 }, abilityAtStep: 14 },
    { pull: { x: 108.7, y: -50.7 }, abilityAtStep: 34 },
  ],
};

export const stage04: StageData = { ...base, stars: fairStars(base) };
