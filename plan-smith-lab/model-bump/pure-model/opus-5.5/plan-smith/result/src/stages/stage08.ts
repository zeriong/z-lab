// 스테이지 8 "철모 부대" — 층마다 재질이 다른 3층 혼합 구조. 새 요소: 철모 돼지(HP 30)
// 철모는 빨강·파랑 직격으로는 죽지 않는다(빨강 ≈25, 파랑 ≈17). 검정 직격+폭발, 또는 가속한 노랑(≈45)이 필요하다.
// P: 돌 벙커(철모 1은 지붕 위, 소형 1은 안) · R: 나무·유리 2층 탑(소형 2) · Q: 돌·나무·유리 3층(철모 2).
// 풀이 1 (117.3,−24.9) 검정: 37스텝째 철모 1 직격(≈33) → 같은 스텝 폭발로 마무리 + 벙커 안 소형 1 (d≈86).
// 풀이 2 (103.9,−59.9) 노랑: 40스텝째(꼭짓점, y≈512) 가속 → (39.5,−0.5)로 R 위를 지나 Q 꼭대기 철모 2 직격(≈45).
// 풀이 3 (107.8,−52.5) 파랑: P 위(y≈564)를 넘어 R 꼭대기 소형 2 직격.
import { fairStars } from '../game/score';
import type { StageData } from '../types';

const base: Omit<StageData, 'stars'> = {
  id: 8,
  name: '철모 부대',
  birds: ['black', 'yellow', 'blue', 'red'],
  blocks: [
    // P: 돌 벙커 (지붕 윗면 760)
    { kind: 'box', material: 'stone', x: 930, y: 800, w: 20, h: 40 },
    { kind: 'box', material: 'stone', x: 1050, y: 800, w: 20, h: 40 },
    { kind: 'box', material: 'stone', x: 990, y: 770, w: 160, h: 20 },
    // R: 1층 나무, 2층 유리 기둥 + 나무 판 (윗면 620)
    { kind: 'box', material: 'wood', x: 1150, y: 770, w: 20, h: 100 },
    { kind: 'box', material: 'wood', x: 1250, y: 770, w: 20, h: 100 },
    { kind: 'box', material: 'wood', x: 1200, y: 710, w: 120, h: 20 },
    { kind: 'box', material: 'glass', x: 1150, y: 670, w: 20, h: 60 },
    { kind: 'box', material: 'glass', x: 1250, y: 670, w: 20, h: 60 },
    { kind: 'box', material: 'wood', x: 1200, y: 630, w: 120, h: 20 },
    // Q: 1층 돌, 2층 나무, 3층 유리 (윗면 560)
    { kind: 'box', material: 'stone', x: 1350, y: 790, w: 20, h: 60 },
    { kind: 'box', material: 'stone', x: 1450, y: 790, w: 20, h: 60 },
    { kind: 'box', material: 'stone', x: 1400, y: 750, w: 120, h: 20 },
    { kind: 'box', material: 'wood', x: 1350, y: 700, w: 20, h: 80 },
    { kind: 'box', material: 'wood', x: 1450, y: 700, w: 20, h: 80 },
    { kind: 'box', material: 'wood', x: 1400, y: 650, w: 120, h: 20 },
    { kind: 'box', material: 'glass', x: 1350, y: 610, w: 20, h: 60 },
    { kind: 'box', material: 'glass', x: 1450, y: 610, w: 20, h: 60 },
    { kind: 'box', material: 'glass', x: 1400, y: 570, w: 120, h: 20 },
  ],
  pigs: [
    { type: 'helmet', x: 990, y: 730 },
    { type: 'small', x: 990, y: 800 },
    { type: 'small', x: 1200, y: 600 },
    { type: 'helmet', x: 1400, y: 530 },
  ],
  slack: 1,
  solution: [
    { pull: { x: 117.3, y: -24.9 }, abilityAtStep: 37 },
    { pull: { x: 103.9, y: -59.9 }, abilityAtStep: 40 },
    { pull: { x: 107.8, y: -52.5 } },
  ],
};

export const stage08: StageData = { ...base, stars: fairStars(base) };
