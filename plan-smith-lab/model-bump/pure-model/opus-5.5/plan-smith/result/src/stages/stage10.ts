// 스테이지 10 "왕의 성" — 돌 성벽, 유리 창, 나무 지붕. 철모 하나는 가운데 탑 꼭대기. 모든 요소 종합. 여유 0.
// T1(돌 망대, 대형 1) · W(돌 기둥 + 유리 창 + 나무 판, 소형) · T2(가운데 탑 3층: 철모 1 꼭대기, 철모 2는 유리 창 안)
// · T3(오른쪽 탑, 대형 2).
// 풀이 1 (117.1,−25.9) 빨강 → T1 대형 1 (34스텝째)
// 풀이 2 (115.3,−33.0) 파랑 → W 위 소형 (41스텝째)
// 풀이 3 (102.8,−61.7) 노랑, 42스텝째(꼭짓점 y≈500) 가속 → T2 꼭대기 철모 1 (x≈1200, y≈506, 데미지 ≈45)
// 풀이 4 (111.7,−43.5) 검정 → T2 2층 유리 창(49스텝째)을 깨고 철모 2 직격, 52스텝째 폭발로 마무리
// 풀이 5 (68.1,−81.2)  검정 → 높은 포물선으로 T2 위(y≈484)를 넘어 T3 대형 2 (97스텝째 직격 + 폭발)
import { fairStars } from '../game/score';
import type { StageData } from '../types';

const base: Omit<StageData, 'stars'> = {
  id: 10,
  name: '왕의 성',
  birds: ['red', 'blue', 'yellow', 'black', 'black'],
  blocks: [
    // T1: 돌 망대 (판 윗면 740)
    { kind: 'box', material: 'stone', x: 870, y: 790, w: 20, h: 60 },
    { kind: 'box', material: 'stone', x: 970, y: 790, w: 20, h: 60 },
    { kind: 'box', material: 'stone', x: 920, y: 750, w: 120, h: 20 },
    // W: 돌 기둥 + 유리 창 + 나무 판 (윗면 720)
    { kind: 'box', material: 'stone', x: 1010, y: 780, w: 20, h: 80 },
    { kind: 'box', material: 'stone', x: 1090, y: 780, w: 20, h: 80 },
    { kind: 'box', material: 'glass', x: 1050, y: 780, w: 60, h: 80 },
    { kind: 'box', material: 'wood', x: 1050, y: 730, w: 120, h: 20 },
    // 성벽 조각
    { kind: 'box', material: 'stone', x: 1130, y: 800, w: 40, h: 40 },
    { kind: 'box', material: 'stone', x: 1370, y: 790, w: 40, h: 60 },
    // T2: 가운데 탑
    { kind: 'box', material: 'stone', x: 1200, y: 770, w: 20, h: 100 },
    { kind: 'box', material: 'stone', x: 1300, y: 770, w: 20, h: 100 },
    { kind: 'box', material: 'stone', x: 1250, y: 710, w: 120, h: 20 },
    { kind: 'box', material: 'glass', x: 1200, y: 660, w: 20, h: 80 },
    { kind: 'box', material: 'glass', x: 1300, y: 660, w: 20, h: 80 },
    { kind: 'box', material: 'wood', x: 1250, y: 610, w: 120, h: 20 },
    { kind: 'box', material: 'stone', x: 1210, y: 580, w: 20, h: 40 },
    { kind: 'box', material: 'stone', x: 1290, y: 580, w: 20, h: 40 },
    { kind: 'box', material: 'wood', x: 1250, y: 550, w: 100, h: 20 },
    // T3: 오른쪽 탑
    { kind: 'box', material: 'stone', x: 1440, y: 760, w: 20, h: 120 },
    { kind: 'box', material: 'stone', x: 1520, y: 760, w: 20, h: 120 },
    { kind: 'box', material: 'stone', x: 1480, y: 690, w: 120, h: 20 },
    { kind: 'box', material: 'glass', x: 1440, y: 660, w: 20, h: 40 },
    { kind: 'box', material: 'glass', x: 1520, y: 660, w: 20, h: 40 },
    { kind: 'box', material: 'wood', x: 1480, y: 630, w: 120, h: 20 },
  ],
  pigs: [
    { type: 'large', x: 920, y: 710 },
    { type: 'small', x: 1050, y: 700 },
    { type: 'helmet', x: 1250, y: 510 },
    { type: 'helmet', x: 1250, y: 670 },
    { type: 'large', x: 1480, y: 590 },
  ],
  slack: 0,
  solution: [
    { pull: { x: 117.1, y: -25.9 } },
    { pull: { x: 115.3, y: -33.0 } },
    { pull: { x: 102.8, y: -61.7 }, abilityAtStep: 42 },
    { pull: { x: 111.7, y: -43.5 }, abilityAtStep: 52 },
    { pull: { x: 68.1, y: -81.2 }, abilityAtStep: 97 },
  ],
};

export const stage10: StageData = { ...base, stars: fairStars(base) };
