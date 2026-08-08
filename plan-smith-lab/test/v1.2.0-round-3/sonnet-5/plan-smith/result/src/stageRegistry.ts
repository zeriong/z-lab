import type { BlockConfig, Material, PigConfig, StageConfig, TerrainSegment } from "./types";
import { calcParScore } from "./scoring";

export const STAGE_COUNT = 10;
export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 540;
export const GROUND_TOP_Y = 500;

const GROUND: TerrainSegment[] = [{ x: WORLD_WIDTH / 2, y: 520, width: WORLD_WIDTH, height: 40 }];
const SLINGSHOT_ANCHOR = { x: 140, y: 440 };

function block(id: string, material: Material, x: number, y: number, width: number, height: number): BlockConfig {
  return { id, material, x, y, width, height };
}

function pig(id: string, x: number, y: number, radius: number, killThreshold: number): PigConfig {
  return { id, x, y, radius, killThreshold };
}

function finalize(stage: Omit<StageConfig, "parScore">): StageConfig {
  return { ...stage, parScore: calcParScore(stage as StageConfig) };
}

// R21 — 스테이지 번호가 오를수록 재질 종류·구조물 복잡도(블록 수)·pig 수·bird 로드아웃이
// 단계적으로 증가한다. 각 스테이지는 저작된 고유 배치이며 로더+placeholder 반복이 아니다.
const STAGES: StageConfig[] = [
  finalize({
    id: 1,
    name: "첫 발사",
    backgroundTint: "#8ecae6",
    birdLoadout: 3,
    slingshotAnchor: SLINGSHOT_ANCHOR,
    terrain: GROUND,
    blocks: [block("b1", "wood", 600, 430, 50, 140)],
    pigs: [pig("p1", 600, 340, 20, 5)]
  }),
  finalize({
    id: 2,
    name: "쌍둥이 기둥",
    backgroundTint: "#a8d8ea",
    birdLoadout: 3,
    slingshotAnchor: SLINGSHOT_ANCHOR,
    terrain: GROUND,
    blocks: [
      block("b1", "wood", 520, 445, 40, 110),
      block("b2", "wood", 720, 445, 40, 110),
      block("b3", "wood", 620, 380, 240, 20)
    ],
    pigs: [pig("p1", 620, 350, 20, 5)]
  }),
  finalize({
    id: 3,
    name: "나무 피라미드",
    backgroundTint: "#bde0fe",
    birdLoadout: 4,
    slingshotAnchor: SLINGSHOT_ANCHOR,
    terrain: GROUND,
    blocks: [
      block("b1", "wood", 460, 470, 60, 60),
      block("b2", "wood", 560, 470, 60, 60),
      block("b3", "wood", 510, 410, 60, 60)
    ],
    pigs: [pig("p1", 380, 480, 20, 6), pig("p2", 640, 480, 20, 6)]
  }),
  finalize({
    id: 4,
    name: "얼음과 돌",
    backgroundTint: "#caf0f8",
    birdLoadout: 4,
    slingshotAnchor: SLINGSHOT_ANCHOR,
    terrain: GROUND,
    blocks: [
      block("b1", "ice", 460, 455, 40, 90),
      block("b2", "stone", 650, 475, 80, 50),
      block("b3", "wood", 650, 440, 140, 20)
    ],
    pigs: [pig("p1", 380, 480, 20, 6), pig("p2", 650, 410, 20, 7)]
  }),
  finalize({
    id: 5,
    name: "삼색 마을",
    backgroundTint: "#f4a261",
    birdLoadout: 4,
    slingshotAnchor: SLINGSHOT_ANCHOR,
    terrain: GROUND,
    blocks: [
      block("b1", "stone", 350, 460, 60, 80),
      block("b2", "ice", 500, 465, 50, 70),
      block("b3", "wood", 650, 450, 50, 100),
      block("b4", "wood", 575, 410, 180, 20),
      block("b5", "stone", 350, 395, 60, 50)
    ],
    pigs: [pig("p1", 350, 350, 20, 7), pig("p2", 575, 380, 20, 7), pig("p3", 750, 480, 20, 6)]
  }),
  finalize({
    id: 6,
    name: "돌계단",
    backgroundTint: "#e76f51",
    birdLoadout: 5,
    slingshotAnchor: SLINGSHOT_ANCHOR,
    terrain: GROUND,
    blocks: [
      block("b1", "stone", 300, 470, 80, 60),
      block("b2", "stone", 400, 450, 80, 100),
      block("b3", "stone", 500, 430, 80, 140),
      block("b4", "wood", 500, 350, 140, 20),
      block("b5", "ice", 300, 415, 50, 50),
      block("b6", "wood", 700, 455, 50, 90)
    ],
    pigs: [pig("p1", 500, 320, 20, 8), pig("p2", 300, 370, 18, 6), pig("p3", 800, 480, 20, 7)]
  }),
  finalize({
    id: 7,
    name: "구름다리",
    backgroundTint: "#2a9d8f",
    birdLoadout: 5,
    slingshotAnchor: SLINGSHOT_ANCHOR,
    terrain: GROUND,
    blocks: [
      block("b1", "stone", 250, 420, 70, 160),
      block("b2", "stone", 710, 420, 70, 160),
      block("b3", "wood", 480, 330, 380, 25),
      block("b4", "wood", 480, 480, 50, 40),
      block("b5", "ice", 250, 320, 50, 40),
      block("b6", "ice", 710, 320, 50, 40),
      block("b7", "wood", 480, 445, 60, 30)
    ],
    pigs: [
      pig("p1", 350, 300, 20, 8),
      pig("p2", 610, 300, 20, 8),
      pig("p3", 480, 440, 20, 7),
      pig("p4", 250, 285, 18, 7)
    ]
  }),
  finalize({
    id: 8,
    name: "요새 정문",
    backgroundTint: "#264653",
    birdLoadout: 5,
    slingshotAnchor: SLINGSHOT_ANCHOR,
    terrain: GROUND,
    blocks: [
      block("b1", "stone", 200, 400, 60, 200),
      block("b2", "stone", 760, 400, 60, 200),
      block("b3", "wood", 400, 440, 60, 120),
      block("b4", "wood", 480, 440, 60, 120),
      block("b5", "wood", 560, 440, 60, 120),
      block("b6", "ice", 440, 365, 90, 30),
      block("b7", "ice", 520, 365, 90, 30),
      block("b8", "stone", 480, 285, 560, 30),
      block("b9", "wood", 820, 470, 40, 60)
    ],
    pigs: [
      pig("p1", 480, 360, 20, 9),
      pig("p2", 440, 333, 18, 8),
      pig("p3", 520, 333, 18, 8),
      pig("p4", 820, 480, 20, 7)
    ]
  }),
  finalize({
    id: 9,
    name: "세 진영",
    backgroundTint: "#6a4c93",
    birdLoadout: 6,
    slingshotAnchor: SLINGSHOT_ANCHOR,
    terrain: GROUND,
    blocks: [
      block("b1", "ice", 180, 455, 50, 90),
      block("b2", "ice", 180, 385, 50, 50),
      block("b3", "wood", 430, 470, 60, 60),
      block("b4", "wood", 510, 470, 60, 60),
      block("b5", "wood", 470, 410, 60, 60),
      block("b6", "stone", 750, 470, 70, 60),
      block("b7", "stone", 750, 410, 70, 60),
      block("b8", "stone", 750, 350, 70, 60),
      block("b9", "wood", 280, 480, 40, 40),
      block("b10", "wood", 650, 480, 40, 40),
      block("b11", "wood", 880, 480, 40, 40)
    ],
    pigs: [
      pig("p1", 180, 343, 18, 8),
      pig("p2", 390, 480, 20, 7),
      pig("p3", 470, 360, 18, 8),
      pig("p4", 750, 300, 20, 10),
      pig("p5", 600, 480, 20, 6)
    ]
  }),
  finalize({
    id: 10,
    name: "최종 결전",
    backgroundTint: "#3d348b",
    birdLoadout: 6,
    slingshotAnchor: SLINGSHOT_ANCHOR,
    terrain: GROUND,
    blocks: [
      block("b1", "stone", 150, 390, 70, 220),
      block("b2", "stone", 810, 390, 70, 220),
      block("b3", "stone", 480, 265, 760, 30),
      block("b4", "wood", 350, 430, 70, 140),
      block("b5", "wood", 480, 430, 70, 140),
      block("b6", "wood", 610, 430, 70, 140),
      block("b7", "ice", 400, 345, 110, 30),
      block("b8", "ice", 560, 345, 110, 30),
      block("b9", "wood", 250, 455, 50, 90),
      block("b10", "wood", 710, 455, 50, 90),
      block("b11", "stone", 430, 470, 100, 20),
      block("b12", "stone", 530, 470, 100, 20),
      block("b13", "ice", 480, 235, 60, 30)
    ],
    pigs: [
      pig("p1", 480, 340, 20, 10),
      pig("p2", 400, 312, 18, 9),
      pig("p3", 560, 312, 18, 9),
      pig("p4", 250, 390, 20, 8),
      pig("p5", 710, 390, 20, 8),
      pig("p6", 480, 198, 22, 12)
    ]
  })
];

export function getStage(stageId: number): StageConfig | undefined {
  return STAGES.find((s) => s.id === stageId);
}

export function getAllStages(): StageConfig[] {
  return STAGES;
}
