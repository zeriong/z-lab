import type { StageData } from '../types';

// 스테이지 5: 돌 도입(고내구) — 정면 돌파 불가 학습 (새 4 / 돼지 3 / +stone)
const stage: StageData = {
  birds: 4,
  pigs: [
    { x: 740, y: 484, r: 16 }, // 나무 탑 안
    { x: 740, y: 384, r: 16 }, // 플랭크 위
    { x: 880, y: 484, r: 16 }, // 유리 상자 안
  ],
  blocks: [
    // 정면의 돌 벽 — 곡사 유도
    { x: 560, y: 455, w: 26, h: 90, material: 'stone' },
    { x: 560, y: 368, w: 26, h: 84, material: 'stone' },
    // 나무 탑
    { x: 700, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 780, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 740, y: 410, w: 160, h: 20, material: 'wood' },
    // 유리 상자
    { x: 845, y: 470, w: 12, h: 60, material: 'glass' },
    { x: 915, y: 470, w: 12, h: 60, material: 'glass' },
    { x: 880, y: 433, w: 84, h: 14, material: 'glass' },
  ],
};

export default stage;
