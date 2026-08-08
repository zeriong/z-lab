import type { StageData } from '../types';

// 스테이지 9: 무게중심 좁은 고탑 — 연쇄 붕괴 유도 (새 5 / 돼지 5 / 혼합)
const stage: StageData = {
  birds: 5,
  pigs: [
    { x: 680, y: 484, r: 16 }, // 탑 좌측 지상
    { x: 860, y: 484, r: 16 }, // 탑 우측 지상
    { x: 760, y: 374, r: 14 }, // 1단 플랭크 위
    { x: 760, y: 264, r: 16 }, // 꼭대기 돌 캡 위
    { x: 905, y: 486, r: 14 },
  ],
  blocks: [
    { x: 760, y: 480, w: 80, h: 40, material: 'stone' }, // 기단
    { x: 735, y: 432, w: 16, h: 56, material: 'wood' },
    { x: 785, y: 432, w: 16, h: 56, material: 'wood' },
    { x: 760, y: 396, w: 110, h: 16, material: 'wood' }, // 1단 플랭크
    { x: 730, y: 360, w: 14, h: 56, material: 'glass' },
    { x: 790, y: 360, w: 14, h: 56, material: 'glass' },
    { x: 760, y: 324, w: 110, h: 16, material: 'wood' }, // 2단 플랭크
    { x: 760, y: 298, w: 56, h: 36, material: 'stone' }, // 무거운 캡 — 붕괴 유도
  ],
};

export default stage;
