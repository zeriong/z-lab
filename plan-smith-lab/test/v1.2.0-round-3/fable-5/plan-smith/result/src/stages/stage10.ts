import type { StageData } from '../types';

// 스테이지 10: 앞 요소 총집합 + 새 수 대비 최소 여유 (새 5 / 돼지 6 / 혼합)
const stage: StageData = {
  birds: 5,
  pigs: [
    { x: 680, y: 484, r: 16 }, // 유리 요새 내부
    { x: 680, y: 384, r: 16 }, // 유리 요새 지붕
    { x: 840, y: 374, r: 14 }, // 고탑 1단
    { x: 840, y: 300, r: 16 }, // 고탑 2단 꼭대기
    { x: 762, y: 484, r: 16 }, // 요새와 탑 사이
    { x: 920, y: 486, r: 14 }, // 최후방
  ],
  blocks: [
    // 정면 돌 벽 (곡사 강제)
    { x: 540, y: 455, w: 26, h: 90, material: 'stone' },
    { x: 540, y: 373, w: 26, h: 74, material: 'stone' },
    // 유리 요새 (x=680)
    { x: 645, y: 460, w: 18, h: 80, material: 'glass' },
    { x: 715, y: 460, w: 18, h: 80, material: 'glass' },
    { x: 680, y: 410, w: 110, h: 20, material: 'wood' },
    // 고탑 (x=840)
    { x: 840, y: 480, w: 70, h: 40, material: 'stone' }, // 기단
    { x: 815, y: 432, w: 16, h: 56, material: 'wood' },
    { x: 865, y: 432, w: 16, h: 56, material: 'wood' },
    { x: 840, y: 396, w: 100, h: 16, material: 'wood' },
    { x: 812, y: 360, w: 14, h: 56, material: 'glass' },
    { x: 868, y: 360, w: 14, h: 56, material: 'glass' },
    { x: 840, y: 324, w: 100, h: 16, material: 'wood' },
  ],
};

export default stage;
