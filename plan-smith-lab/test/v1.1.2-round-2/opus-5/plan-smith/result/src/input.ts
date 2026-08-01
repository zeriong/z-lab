/**
 * 입력 (R7): Pointer Events 한 경로로 마우스·터치를 동일 처리한다.
 * 좌표는 캔버스 실측 사각형으로 나누어 논리 좌표(1280x720)로 환산 → 레터박스/DPR과 무관.
 */

import type { Vec2 } from './types';
import { GRAVITY_ACC, GROUND_Y, LOGICAL_H, LOGICAL_W, PRED_POINTS, PRED_STEP_INTERVAL } from './tuning';

export interface InputHandlers {
  /** true 를 돌려주면 드래그(조준) 시작으로 승격 */
  onPullStart(p: Vec2): boolean;
  onPullMove(p: Vec2): void;
  onPullEnd(p: Vec2): void;
  /** 탭(움직임 거의 없는 클릭) — 대시 발동 */
  onTap(p: Vec2): void;
}

const TAP_SLOP = 12;

export function toLogical(canvas: HTMLCanvasElement, clientX: number, clientY: number): Vec2 {
  const r = canvas.getBoundingClientRect();
  const w = r.width || LOGICAL_W;
  const h = r.height || LOGICAL_H;
  return {
    x: ((clientX - r.left) / w) * LOGICAL_W,
    y: ((clientY - r.top) / h) * LOGICAL_H,
  };
}

/** 등록은 이 함수 한 곳에서만 — 해제 함수를 반드시 쌍으로 돌려준다(§9 리스너 누수) */
export function attachInput(canvas: HTMLCanvasElement, h: InputHandlers): () => void {
  let activeId: number | null = null;
  let pulling = false;
  let startPos: Vec2 = { x: 0, y: 0 };
  let moved = 0;

  const down = (e: PointerEvent): void => {
    if (activeId !== null) return;
    activeId = e.pointerId;
    moved = 0;
    startPos = toLogical(canvas, e.clientX, e.clientY);
    pulling = h.onPullStart(startPos);
    if (pulling) {
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };

  const move = (e: PointerEvent): void => {
    if (activeId !== e.pointerId) return;
    const p = toLogical(canvas, e.clientX, e.clientY);
    moved = Math.max(moved, Math.hypot(p.x - startPos.x, p.y - startPos.y));
    if (pulling) {
      h.onPullMove(p);
      e.preventDefault();
    }
  };

  const up = (e: PointerEvent): void => {
    if (activeId !== e.pointerId) return;
    const p = toLogical(canvas, e.clientX, e.clientY);
    if (pulling) {
      h.onPullEnd(p);
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    } else if (moved <= TAP_SLOP) {
      h.onTap(p);
    }
    pulling = false;
    activeId = null;
  };

  const cancel = (e: PointerEvent): void => {
    if (activeId !== e.pointerId) return;
    if (pulling) h.onPullEnd(startPos); // 취소는 "당김 없음"으로 종료 → 발사되지 않는다
    pulling = false;
    activeId = null;
  };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);
  const ctxMenu = (e: Event): void => e.preventDefault();
  canvas.addEventListener('contextmenu', ctxMenu);

  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', cancel);
    canvas.removeEventListener('contextmenu', ctxMenu);
  };
}

/**
 * 궤적 예측 (§8: 12점 / 4스텝 간격 / 충돌 무시).
 * 물리와 같은 적분식(v += a; p += v)을 쓴다 — 새의 frictionAir 가 0 이므로 초반 경로가 어긋나지 않는다.
 */
export function predictPath(origin: Vec2, vx: number, vy: number): Vec2[] {
  const pts: Vec2[] = [];
  let px = origin.x;
  let py = origin.y;
  let dx = vx;
  let dy = vy;
  const total = PRED_POINTS * PRED_STEP_INTERVAL;
  for (let i = 1; i <= total; i += 1) {
    dy += GRAVITY_ACC;
    px += dx;
    py += dy;
    if (i % PRED_STEP_INTERVAL === 0) pts.push({ x: px, y: py });
    if (py > GROUND_Y || px > LOGICAL_W + 80) break;
  }
  return pts;
}
