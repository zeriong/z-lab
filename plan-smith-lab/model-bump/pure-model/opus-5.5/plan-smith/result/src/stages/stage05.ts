// 스테이지 5 "돌 받침" — 돌 하부 + 나무·유리 상부 3층. 새 요소: 돌, 대형 돼지
// 가까울수록 낮고 멀수록 높은 계단형 구조 셋: X(돌 1층) · Y(돌+나무) · Z(돌+나무+유리 3층).
// 풀이 1 (116.6,−28.0) 빨강 → X 위 대형 돼지 (36스텝째 접촉, 데미지 ≈28 > 15)
// 풀이 2 (108.7,−50.7) 노랑 → Y 위 소형 돼지 (50–51스텝째, X 위 y≈577로 통과)
// 풀이 3 (99.4,−67.0)  파랑 → Z 꼭대기 소형 돼지 (68스텝째, Y 위 y≈477로 통과)
import { fairStars } from '../game/score';
import type { BlockDef, MaterialId, StageData } from '../types';

/** 층 하나: 기둥 둘 + 판. bottom = 층 바닥 y */
function floor(cx: number, bottom: number, pillarH: number, pillarMat: MaterialId, plankMat: MaterialId): BlockDef[] {
  return [
    { kind: 'box', material: pillarMat, x: cx - 50, y: bottom - pillarH / 2, w: 20, h: pillarH },
    { kind: 'box', material: pillarMat, x: cx + 50, y: bottom - pillarH / 2, w: 20, h: pillarH },
    { kind: 'box', material: plankMat, x: cx, y: bottom - pillarH - 10, w: 120, h: 20 },
  ];
}

const base: Omit<StageData, 'stars'> = {
  id: 5,
  name: '돌 받침',
  birds: ['red', 'yellow', 'blue', 'red'],
  blocks: [
    // X: 돌 1층 (판 윗면 740)
    ...floor(950, 820, 60, 'stone', 'stone'),
    // Y: 돌 1층 + 나무 1층 (판 윗면 640)
    ...floor(1200, 820, 60, 'stone', 'stone'),
    ...floor(1200, 740, 80, 'wood', 'wood'),
    // Z: 돌 + 나무 + 유리 (판 윗면 560)
    ...floor(1450, 820, 60, 'stone', 'stone'),
    ...floor(1450, 740, 80, 'wood', 'wood'),
    ...floor(1450, 640, 60, 'glass', 'glass'),
  ],
  pigs: [
    { type: 'large', x: 950, y: 710 },
    { type: 'small', x: 1200, y: 620 },
    { type: 'small', x: 1450, y: 540 },
  ],
  slack: 1,
  solution: [
    { pull: { x: 116.6, y: -28.0 } },
    { pull: { x: 108.7, y: -50.7 } },
    { pull: { x: 99.4, y: -67.0 } },
  ],
};

export const stage05: StageData = { ...base, stars: fairStars(base) };
