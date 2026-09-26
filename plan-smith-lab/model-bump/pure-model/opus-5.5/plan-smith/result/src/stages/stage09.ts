// 스테이지 9 "두 언덕" — 가까운 나무 요새 + 먼 정적 언덕(x≈1450, 높이 220) 위 돌 망루.
// 새 요소: 정적 지형, 원거리 사격. 여유 0 (새 4 = 풀이 4발).
// 풀이 1 (112.0,−43.0) 노랑 → 요새 F2 위 소형 a (45스텝째, F1 위 y≈614로 통과)
// 풀이 2 (104.4,−59.0) 파랑 → 언덕 가장자리 소형 c (61스텝째, 언덕 윗면 바로 위)
// 풀이 3 (97.6,−69.6)  검정 → 망루 꼭대기 철모 (68스텝째 직격 ≈27) → 같은 스텝 폭발로 마무리(+≈18),
//                           망루 판 아래 소형 b는 폭발 거리 ≈98 → 데미지 ≈9 > 6
// 풀이 4 (116.6,−28.0) 빨강 → 요새 F1 위 대형 (33스텝째 직격 ≈28 > 15)
import { fairStars } from '../game/score';
import type { StageData } from '../types';

const base: Omit<StageData, 'stars'> = {
  id: 9,
  name: '두 언덕',
  birds: ['yellow', 'blue', 'black', 'red'],
  statics: [{ x: 1450, y: 710, w: 220, h: 220 }], // 언덕: x 1340–1560, 윗면 600
  blocks: [
    // F1: 나무 요새 (판 윗면 720)
    { kind: 'box', material: 'wood', x: 860, y: 780, w: 20, h: 80 },
    { kind: 'box', material: 'wood', x: 940, y: 780, w: 20, h: 80 },
    { kind: 'box', material: 'wood', x: 900, y: 730, w: 120, h: 20 },
    { kind: 'box', material: 'wood', x: 900, y: 800, w: 40, h: 40 },
    // F2: 높은 나무 요새 (판 윗면 680)
    { kind: 'box', material: 'wood', x: 1080, y: 760, w: 20, h: 120 },
    { kind: 'box', material: 'wood', x: 1160, y: 760, w: 20, h: 120 },
    { kind: 'box', material: 'wood', x: 1120, y: 690, w: 120, h: 20 },
    { kind: 'box', material: 'stone', x: 1120, y: 800, w: 40, h: 40 },
    // 언덕 위 돌 망루 (판 윗면 540)
    { kind: 'box', material: 'stone', x: 1400, y: 580, w: 20, h: 40 },
    { kind: 'box', material: 'stone', x: 1500, y: 580, w: 20, h: 40 },
    { kind: 'box', material: 'stone', x: 1450, y: 550, w: 140, h: 20 },
  ],
  pigs: [
    { type: 'large', x: 900, y: 690 },
    { type: 'small', x: 1120, y: 660 },
    { type: 'small', x: 1362, y: 580 },
    { type: 'helmet', x: 1450, y: 510 },
    { type: 'small', x: 1450, y: 580 },
  ],
  slack: 0,
  solution: [
    { pull: { x: 112.0, y: -43.0 } },
    { pull: { x: 104.4, y: -59.0 } },
    { pull: { x: 97.6, y: -69.6 }, abilityAtStep: 68 },
    { pull: { x: 116.6, y: -28.0 } },
  ],
};

export const stage09: StageData = { ...base, stars: fairStars(base) };
