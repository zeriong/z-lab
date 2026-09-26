/**
 * 레벨 저작용 빌더 헬퍼 (§7.2). 전부 EntityDef 를 돌려주는 순수 함수.
 * 좌표는 바닥 중심 기준. 규격: 판자 20×80 / 80×20, 상자 40×40, 기둥 20×160, 삼각 지붕 r46, 원 r20.
 */
import type { BlockDef, EntityDef, Material, PigDef, PigSize, TerrainDef } from './types';

export const GROUND = 660;

export const PLANK_W = 20;
export const PLANK_H = 80;
export const BOX = 40;
export const PILLAR_H = 160;
export const TRI_R = 46;
export const BALL_R = 20;

export const PIG_RADIUS: Record<PigSize, number> = { small: 14, medium: 20, large: 26 };

/** 세로 판자 20×h (기본 80) */
export const plankV = (x: number, y: number, material: Material, h = PLANK_H): BlockDef => ({
  kind: 'block',
  material,
  shape: 'rect',
  x,
  y,
  w: PLANK_W,
  h,
});

/** 가로 판자 w×20 (기본 80) */
export const plankH = (x: number, y: number, material: Material, w = PLANK_H): BlockDef => ({
  kind: 'block',
  material,
  shape: 'rect',
  x,
  y,
  w,
  h: PLANK_W,
});

/** 상자 40×40 */
export const box = (x: number, y: number, material: Material, size = BOX): BlockDef => ({
  kind: 'block',
  material,
  shape: 'rect',
  x,
  y,
  w: size,
  h: size,
});

/** 기둥 20×160 */
export const pillar = (x: number, y: number, material: Material): BlockDef =>
  plankV(x, y, material, PILLAR_H);

/** 정삼각 지붕 (밑변 ≈ 80, 높이 69) */
export const roof = (x: number, y: number, material: Material): BlockDef => ({
  kind: 'block',
  material,
  shape: 'tri',
  x,
  y,
  r: TRI_R,
});

/** 원 r20 */
export const ball = (x: number, y: number, material: Material): BlockDef => ({
  kind: 'block',
  material,
  shape: 'circle',
  x,
  y,
  r: BALL_R,
});

export const pig = (size: PigSize, x: number, y = GROUND): PigDef => ({ kind: 'pig', size, x, y });

/** 정적 발판. topY 는 윗면 높이 */
export const platform = (x: number, topY: number, w: number, h = 20): TerrainDef => ({
  kind: 'terrain',
  x,
  y: topY + h,
  w,
  h,
});

/** 탑: 층마다 기둥 2(x±30) + 가로 판자 80. 층 높이 100 */
export function tower(x: number, groundY: number, floors: number, material: Material): EntityDef[] {
  const out: EntityDef[] = [];
  for (let i = 0; i < floors; i++) {
    const base = groundY - 100 * i;
    out.push(plankV(x - 30, base, material), plankV(x + 30, base, material));
    out.push(plankH(x, base - PLANK_H, material, 80));
  }
  return out;
}

/** 오두막 기둥 반간격: 돼지 반지름 + 20 */
export const HUT_HALF_SPAN: Record<PigSize, number> = { small: 34, medium: 40, large: 46 };

export interface HutOptions {
  roofMaterial?: Material;
  /** 지붕 판자 위에 삼각 지붕 추가 */
  tri?: boolean;
}

/** 오두막: 기둥 2 + 지붕 판자 + 안에 돼지. 돼지 크기에 맞춰 간격이 정해진다. */
export function hut(
  x: number,
  groundY: number,
  material: Material,
  pigSize: PigSize,
  opts: HutOptions = {},
): EntityDef[] {
  const s = HUT_HALF_SPAN[pigSize];
  const roofMat = opts.roofMaterial ?? material;
  const out: EntityDef[] = [
    plankV(x - s, groundY, material),
    plankV(x + s, groundY, material),
    plankH(x, groundY - PLANK_H, roofMat, 2 * s + PLANK_W),
    pig(pigSize, x, groundY),
  ];
  if (opts.tri) out.push(roof(x, groundY - PLANK_H - PLANK_W, roofMat));
  return out;
}

/** 상자를 세로로 count 개 쌓는다 */
export function stack(x: number, groundY: number, count: number, material: Material, size = BOX): EntityDef[] {
  const out: EntityDef[] = [];
  for (let i = 0; i < count; i++) out.push(box(x, groundY - size * i, material, size));
  return out;
}
