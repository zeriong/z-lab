/**
 * §10.3 구조물 프리팹. 각 함수는 {blocks, pigs} 조각을 반환하고
 * 스테이지 파일에서 spread로 합친다. groundY는 "바닥면의 y"(구조물이 서는 지면 높이).
 */

import type { BlockData, BlockMaterial, PigData, StagePiece } from './schema';

const COL_W = 22; // 기둥 두께
const SLAB_H = 20; // 상판 두께

export function box(
  material: BlockMaterial,
  x: number,
  y: number,
  w: number,
  h: number,
  angle = 0,
): BlockData {
  return { shape: 'box', material, x, y, w, h, angle };
}

export function ball(material: BlockMaterial, x: number, y: number, d: number): BlockData {
  return { shape: 'ball', material, x, y, w: d, h: d };
}

export function pig(x: number, y: number, r = 17): PigData {
  return { x, y, r };
}

export interface TowerOpts {
  floors?: number;
  material?: BlockMaterial;
  /** 기둥 간 간격(상판 폭) */
  span?: number;
  /** 층 높이 */
  floorH?: number;
  /** 돼지를 넣을 층 인덱스(0부터) */
  pigFloors?: number[];
}

/** 기둥2 + 상판 반복. x는 탑의 중심. */
export function tower(x: number, groundY: number, opts: TowerOpts = {}): StagePiece {
  const floors = opts.floors ?? 3;
  const material = opts.material ?? 'wood';
  const span = opts.span ?? 96;
  const floorH = opts.floorH ?? 74;

  const blocks: BlockData[] = [];
  const pigs: PigData[] = [];
  let y = groundY;

  for (let f = 0; f < floors; f++) {
    const colH = floorH - SLAB_H;
    const colCy = y - colH / 2;
    blocks.push(box(material, x - span / 2, colCy, COL_W, colH));
    blocks.push(box(material, x + span / 2, colCy, COL_W, colH));

    const slabCy = y - colH - SLAB_H / 2;
    blocks.push(box(material, x, slabCy, span + COL_W + 18, SLAB_H));

    if (opts.pigFloors?.includes(f)) {
      pigs.push(pig(x, y - 20));
    }
    y -= floorH;
  }

  return { blocks, pigs };
}

export interface HutOpts {
  material?: BlockMaterial;
  pigInside?: boolean;
  width?: number;
  height?: number;
  /** 지붕만 다른 재료로 */
  roofMaterial?: BlockMaterial;
}

/** 벽2 + 지붕1. 안쪽에 돼지 1마리. x는 오두막 중심. */
export function hut(x: number, groundY: number, opts: HutOpts = {}): StagePiece {
  const material = opts.material ?? 'wood';
  const roofMaterial = opts.roofMaterial ?? material;
  const w = opts.width ?? 110;
  const h = opts.height ?? 88;

  const blocks: BlockData[] = [
    box(material, x - w / 2, groundY - h / 2, COL_W, h),
    box(material, x + w / 2, groundY - h / 2, COL_W, h),
    box(roofMaterial, x, groundY - h - SLAB_H / 2, w + COL_W + 20, SLAB_H),
  ];
  const pigs: PigData[] = [];
  if (opts.pigInside !== false) pigs.push(pig(x, groundY - 18));

  return { blocks, pigs };
}

export interface BridgeOpts {
  span?: number;
  pillars?: number;
  material?: BlockMaterial;
  /** 상판 위에 얹을 돼지 수 */
  pigsOnTop?: number;
  deckH?: number;
}

/** 지지대 n개 + 긴 상판. 지지대를 부수면 상판이 무너진다. x는 다리 좌측 끝. */
export function bridge(x: number, groundY: number, opts: BridgeOpts = {}): StagePiece {
  const span = opts.span ?? 240;
  const pillars = opts.pillars ?? 2;
  const material = opts.material ?? 'wood';
  const deckH = opts.deckH ?? 18;
  const pillarH = 96;

  const blocks: BlockData[] = [];
  const pigs: PigData[] = [];

  for (let i = 0; i < pillars; i++) {
    const px = x + (span / (pillars - 1 || 1)) * i;
    blocks.push(box(material, px, groundY - pillarH / 2, COL_W, pillarH));
  }

  const deckCx = x + span / 2;
  const deckCy = groundY - pillarH - deckH / 2;
  blocks.push(box(material, deckCx, deckCy, span + 60, deckH));

  const n = opts.pigsOnTop ?? 0;
  for (let i = 0; i < n; i++) {
    const px = deckCx - ((n - 1) * 60) / 2 + i * 60;
    pigs.push(pig(px, deckCy - deckH / 2 - 19));
  }

  return { blocks, pigs };
}

export interface PyramidOpts {
  rows?: number;
  material?: BlockMaterial;
  unit?: number;
  pigAtTop?: boolean;
}

/** 아래가 넓은 계단식 피라미드. x는 중심. */
export function pyramid(x: number, groundY: number, opts: PyramidOpts = {}): StagePiece {
  const rows = opts.rows ?? 4;
  const material = opts.material ?? 'ice';
  const unit = opts.unit ?? 40;

  const blocks: BlockData[] = [];
  const pigs: PigData[] = [];

  for (let r = 0; r < rows; r++) {
    const count = rows - r;
    const rowW = count * unit;
    const cy = groundY - unit / 2 - r * unit;
    for (let c = 0; c < count; c++) {
      const cx = x - rowW / 2 + unit / 2 + c * unit;
      blocks.push(box(material, cx, cy, unit - 4, unit - 4));
    }
  }

  if (opts.pigAtTop) {
    pigs.push(pig(x, groundY - rows * unit - 19));
  }

  return { blocks, pigs };
}

/** 여러 조각을 하나로 합친다. */
export function merge(...pieces: StagePiece[]): StagePiece {
  const blocks: BlockData[] = [];
  const pigs: PigData[] = [];
  for (const p of pieces) {
    blocks.push(...p.blocks);
    pigs.push(...p.pigs);
  }
  return { blocks, pigs };
}

export const prefab = { tower, hut, bridge, pyramid, merge, box, ball, pig };
