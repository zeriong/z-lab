// 10개 스테이지 JSON 데이터를 생성하는 개발용 스크립트.
// 결과물(src/data/stages/stage-XX.json)은 런타임에 정적 파일로 로드된다.
// 실행: node scripts/gen-stages.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "data", "stages");
mkdirSync(OUT_DIR, { recursive: true });

const GROUND_Y = 640;
const ANCHOR = { x: 150, y: GROUND_Y - 120 };

function rect(type, x, y, w, h, angle = 0) {
  return { type, shape: "rect", x, y, w, h, angle };
}
function circle(type, x, y, d) {
  return { type, shape: "circle", x, y, w: d };
}
function pig(x, y, r = 22) {
  return { x, y, r };
}

/** 기둥 2개 + 지붕 하나로 된 탑. 지붕 아래 공간에 돼지를 넣을 수 있다. */
function tower(xCenter, material, pillarH, opts = {}) {
  const pillarW = opts.pillarW ?? 20;
  const roofW = opts.roofW ?? 140;
  const roofH = opts.roofH ?? 22;
  const gap = roofW - pillarW;
  const leftX = xCenter - gap / 2;
  const rightX = xCenter + gap / 2;
  const pillarY = GROUND_Y - pillarH / 2;
  const roofY = GROUND_Y - pillarH - roofH / 2;
  return {
    blocks: [
      rect(material, leftX, pillarY, pillarW, pillarH),
      rect(material, rightX, pillarY, pillarW, pillarH),
      rect(material, xCenter, roofY, roofW, roofH),
    ],
    insidePigY: GROUND_Y - (opts.pigR ?? 22),
    roofBottomY: roofY + roofH / 2,
  };
}

/** 낮은 벽 하나 (지붕 없음 — 넘겨 쏘면 뒤쪽 돼지를 직접 맞출 수 있다) */
function wall(xCenter, material, height, w = 50) {
  const y = GROUND_Y - height / 2;
  return { blocks: [rect(material, xCenter, y, w, height)], topY: GROUND_Y - height };
}

/** 벽돌 피라미드 (아래로 갈수록 넓어짐) */
function pyramid(xCenter, material, rows, blockW = 42, blockH = 34) {
  const blocks = [];
  for (let row = 0; row < rows; row++) {
    const countInRow = rows - row;
    const y = GROUND_Y - blockH / 2 - row * blockH;
    const totalW = countInRow * blockW;
    const startX = xCenter - totalW / 2 + blockW / 2;
    for (let i = 0; i < countInRow; i++) {
      blocks.push(rect(material, startX + i * blockW, y, blockW - 2, blockH - 2));
    }
  }
  return { blocks, topY: GROUND_Y - rows * blockH };
}

/** 기둥 위에 얹힌 평평한 플랫폼 (그 위에 돼지가 앉을 수 있음) */
function platform(xCenter, material, height, width = 160) {
  const pillarW = 20;
  const deckH = 20;
  const pillarY = GROUND_Y - height / 2;
  const deckY = GROUND_Y - height - deckH / 2;
  return {
    blocks: [
      rect(material, xCenter - width / 2 + pillarW / 2, pillarY, pillarW, height),
      rect(material, xCenter + width / 2 - pillarW / 2, pillarY, pillarW, height),
      rect(material, xCenter, deckY, width, deckH),
    ],
    topY: deckY - deckH / 2,
  };
}

function stage({ id, name, worldWidth, birds, blocks, pigs, parScore }) {
  return {
    id,
    name,
    worldWidth,
    groundY: GROUND_Y,
    slingshotAnchor: ANCHOR,
    birds,
    pigs,
    blocks,
    parScore,
  };
}

const stages = [];

// --- Stage 1: 돼지 하나가 탁 트인 곳에 있고, 나무 블록은 뒤쪽에 장식으로만 배치
// (조준선을 막는 장애물이 전혀 없어 첫 발사부터 직격이 가능한 튜토리얼) ---
{
  const w = wall(720, "wood", 60); // 돼지보다 더 뒤쪽 -> 비행 경로를 막지 않음
  stages.push(
    stage({
      id: 1,
      name: "1. 첫 발사",
      worldWidth: 1200,
      birds: ["normal", "normal", "normal"],
      blocks: w.blocks,
      pigs: [pig(600, GROUND_Y - 22)],
      parScore: 2500,
    })
  );
}

// --- Stage 2: 돼지 두 마리, 각 돼지 뒤쪽에 나무 블록 (경로를 막지 않음) ---
{
  const w1 = wall(600, "wood", 60);
  const w2 = wall(1050, "wood", 70);
  stages.push(
    stage({
      id: 2,
      name: "2. 두 개의 성",
      worldWidth: 1300,
      birds: ["normal", "normal", "normal"],
      blocks: [...w1.blocks, ...w2.blocks],
      pigs: [pig(500, GROUND_Y - 22), pig(930, GROUND_Y - 22)],
      parScore: 3200,
    })
  );
}

// --- Stage 3: 나무 피라미드 뒤에 돼지 2마리 ---
{
  const p = pyramid(700, "wood", 4);
  stages.push(
    stage({
      id: 3,
      name: "3. 나무 피라미드",
      worldWidth: 1350,
      birds: ["normal", "normal", "normal"],
      blocks: p.blocks,
      pigs: [pig(950, GROUND_Y - 22), pig(1050, GROUND_Y - 22)],
      parScore: 3600,
    })
  );
}

// --- Stage 4: 재질 혼합 (돌 받침 + 유리 탑), 돼지 2마리 ---
{
  const base = rect("stone", 750, GROUND_Y - 30, 260, 60);
  const glassTower = tower(750, "glass", 90, { pillarW: 18, roofW: 120 });
  // 유리 탑을 돌 받침 위로 올림
  const offsetY = 60; // base height
  const shifted = glassTower.blocks.map((b) => ({ ...b, y: b.y - offsetY }));
  stages.push(
    stage({
      id: 4,
      name: "4. 유리와 돌",
      worldWidth: 1400,
      birds: ["normal", "normal", "normal"],
      blocks: [base, ...shifted],
      pigs: [pig(750, glassTower.insidePigY - offsetY), pig(1100, GROUND_Y - 22)],
      parScore: 4000,
    })
  );
}

// --- Stage 5: 스피디 새 등장, 유리 벽 연속 돌파 ---
{
  const wallXs = [700, 780, 860];
  const blocks = wallXs.map((x) => rect("glass", x, GROUND_Y - 60, 24, 120));
  stages.push(
    stage({
      id: 5,
      name: "5. 가속 돌파",
      worldWidth: 1450,
      birds: ["normal", "speedy", "speedy"],
      blocks,
      pigs: [pig(1000, GROUND_Y - 22), pig(1200, GROUND_Y - 22)],
      parScore: 4200,
    })
  );
}

// --- Stage 6: 폭탄 새 등장, 나무 벽 뒤 돼지 3마리 ---
{
  const wall = [
    rect("wood", 900, GROUND_Y - 40, 26, 80),
    rect("wood", 950, GROUND_Y - 40, 26, 80),
    rect("wood", 1000, GROUND_Y - 40, 26, 80),
    rect("wood", 950, GROUND_Y - 96, 160, 30),
  ];
  stages.push(
    stage({
      id: 6,
      name: "6. 폭탄 투하",
      worldWidth: 1500,
      birds: ["normal", "bomb", "bomb"],
      blocks: wall,
      pigs: [pig(880, GROUND_Y - 22), pig(950, GROUND_Y - 22), pig(1020, GROUND_Y - 22)],
      parScore: 4600,
    })
  );
}

// --- Stage 7: 다단 구조물 (돌 기반 + 나무 피라미드 + 유리 지붕), 돼지 3마리 ---
{
  const plat = platform(700, "stone", 60, 200);
  const p = pyramid(1000, "wood", 3, 40, 32);
  const glassRoof = rect("glass", 1000, p.topY - 15, 130, 26);
  stages.push(
    stage({
      id: 7,
      name: "7. 겹겹의 요새",
      worldWidth: 1650,
      birds: ["normal", "speedy", "bomb", "normal"],
      blocks: [...plat.blocks, ...p.blocks, glassRoof],
      pigs: [pig(700, plat.topY - 22), pig(1000, p.topY - 45), pig(1250, GROUND_Y - 22)],
      parScore: 5200,
    })
  );
}

// --- Stage 8: 정밀 조준 - 좁은 틈 사이 유리탑들, 돼지 3마리 ---
{
  const t1 = tower(750, "glass", 70, { pillarW: 16, roofW: 90, pigR: 18 });
  const t2 = tower(950, "glass", 100, { pillarW: 16, roofW: 90, pigR: 18 });
  const t3 = tower(1150, "glass", 70, { pillarW: 16, roofW: 90, pigR: 18 });
  stages.push(
    stage({
      id: 8,
      name: "8. 정밀 사격",
      worldWidth: 1700,
      birds: ["speedy", "speedy", "normal"],
      blocks: [...t1.blocks, ...t2.blocks, ...t3.blocks],
      pigs: [pig(750, t1.insidePigY, 18), pig(950, t2.insidePigY, 18), pig(1150, t3.insidePigY, 18)],
      parScore: 5600,
    })
  );
}

// --- Stage 9: 복합 구조 - 탑+피라미드+플랫폼, 돼지 4마리 ---
{
  const t = tower(650, "stone", 120, { roofW: 150 });
  const p = pyramid(950, "wood", 4, 40, 32);
  const plat = platform(1250, "glass", 90, 170);
  stages.push(
    stage({
      id: 9,
      name: "9. 혼합 전선",
      worldWidth: 1900,
      birds: ["normal", "speedy", "bomb", "normal"],
      blocks: [...t.blocks, ...p.blocks, ...plat.blocks],
      pigs: [
        pig(650, t.insidePigY),
        pig(880, GROUND_Y - 22),
        pig(1020, GROUND_Y - 22),
        pig(1250, plat.topY - 22),
      ],
      parScore: 6400,
    })
  );
}

// --- Stage 10: 최종 요새 - 대형 다단 구조, 돼지 5마리 ---
{
  const baseWall = [
    rect("stone", 700, GROUND_Y - 50, 30, 100),
    rect("stone", 900, GROUND_Y - 50, 30, 100),
    rect("stone", 800, GROUND_Y - 115, 250, 30),
  ];
  const p1 = pyramid(1150, "wood", 4, 40, 32);
  const t = tower(1450, "glass", 90, { roofW: 130, pigR: 20 });
  const plat = platform(1650, "stone", 130, 180);
  stages.push(
    stage({
      id: 10,
      name: "10. 최후의 요새",
      worldWidth: 2200,
      birds: ["normal", "speedy", "bomb", "speedy", "normal"],
      blocks: [...baseWall, ...p1.blocks, ...t.blocks, ...plat.blocks],
      pigs: [
        pig(800, GROUND_Y - 145),
        pig(1080, GROUND_Y - 22),
        pig(1220, GROUND_Y - 22),
        pig(1450, t.insidePigY, 20),
        pig(1650, plat.topY - 22),
      ],
      parScore: 8000,
    })
  );
}

for (const s of stages) {
  const filename = `stage-${String(s.id).padStart(2, "0")}.json`;
  writeFileSync(join(OUT_DIR, filename), JSON.stringify(s, null, 2));
  console.log(`wrote ${filename} (blocks=${s.blocks.length}, pigs=${s.pigs.length})`);
}
