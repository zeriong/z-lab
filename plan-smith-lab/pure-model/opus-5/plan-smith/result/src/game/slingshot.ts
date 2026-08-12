/**
 * SlingshotController — 드래그·궤적·발사 (R5, R6, R8, R12의 탭).
 *
 * 이 파일은 두 층으로 나뉜다:
 *  - 위쪽 순수 함수(predictPath / solveLaunch / pullToVelocity): DOM을 모른다.
 *    궤적 점선(R6)과 리플레이 픽스처가 같은 식을 쓰게 하려고 분리했다.
 *  - 아래쪽 컨트롤러: Pointer Events 하나로 마우스·터치를 덮는다(A2).
 *    A2가 틀리면 touchstart/move/end 폴백을 이 클래스 안에만 추가한다.
 */

import { Body, Vector } from 'matter-js';
import type { Camera } from '../render/camera';
import { gravityPerStep } from '../physics/world';

/** 앵커에서 새가 늘어나는 최대 거리(px). §3-5의 96px. */
export const MAX_PULL = 96;

/**
 * 당긴 거리 → 속도 배율(px/step per px).
 * 최대 당김 96px × 0.22 = 21.1 px/step ≒ 1,267 px/s.
 * 스테이지 폭(약 2,000px)을 2초 안에 가로지르는 속도 — 조준 오차를
 * 눈으로 보정할 수 있는 상한이다.
 */
export const LAUNCH_POWER = 0.22;

/** 드래그로 인정하는 최소 거리. 이보다 짧으면 발사 취소(오탭 방지). */
export const MIN_PULL = 8;

/** 새총 잡기 반경 */
export const GRAB_RADIUS = 54;

/** R6: 점 10개, 0.08초 간격 */
export const PREVIEW_DOTS = 10;
export const PREVIEW_STEP_INTERVAL = (0.08 * 1000) / (1000 / 60); // = 4.8 스텝

/** 당김 벡터(앵커→포인터) → 발사 속도. 반대 방향으로 나간다. */
export function pullToVelocity(pull: Vector): Vector {
  return { x: -pull.x * LAUNCH_POWER, y: -pull.y * LAUNCH_POWER };
}

/** 앵커 기준 당김을 MAX_PULL로 자른다. */
export function clampPull(anchor: Vector, pointer: Vector, maxPull = MAX_PULL): Vector {
  const dx = pointer.x - anchor.x;
  const dy = pointer.y - anchor.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxPull || dist === 0) return { x: dx, y: dy };
  const k = maxPull / dist;
  return { x: dx * k, y: dy * k };
}

/**
 * 반암시적 오일러(Matter의 적분과 같은 형태)로 위치를 전개한다.
 *   v_{k+1} = v_k + g
 *   p_{k+1} = p_k + v_{k+1}
 *   ⇒ p(n) = p0 + n·v0 + g·n(n+1)/2
 * 공기저항은 무시한다 — frictionAir 0.005에서 1초(60스텝) 뒤 오차는
 * 궤적 점 굵기 수준이고, 예측선이 "대략 이쪽"의 역할만 하면 되기 때문.
 */
export function predictPath(
  origin: Vector,
  velocity: Vector,
  gravityY: number,
  dots = PREVIEW_DOTS,
  stepInterval = PREVIEW_STEP_INTERVAL,
): Vector[] {
  const g = gravityPerStep(gravityY);
  const out: Vector[] = [];
  for (let i = 1; i <= dots; i += 1) {
    const n = i * stepInterval;
    out.push({
      x: origin.x + velocity.x * n,
      y: origin.y + velocity.y * n + (g * n * (n + 1)) / 2,
    });
  }
  return out;
}

/**
 * 목표점을 n스텝 만에 지나는 초기 속도를 푼다. predictPath의 역함수.
 * 리플레이 픽스처(tests/fixtures/replays.json)가 좌표 대신 "겨냥점"을 적을 수
 * 있게 하는 함수 — 임계값을 만져도 픽스처를 다시 적지 않아도 된다.
 */
export function solveLaunch(origin: Vector, target: Vector, steps: number, gravityY: number): Vector {
  const g = gravityPerStep(gravityY);
  const n = Math.max(1, steps);
  return {
    x: (target.x - origin.x) / n,
    y: (target.y - origin.y - (g * n * (n + 1)) / 2) / n,
  };
}

/** 발사 속도의 상한(= MAX_PULL 당김). 리플레이 해가 물리적으로 가능한지 검사한다. */
export const MAX_LAUNCH_SPEED = MAX_PULL * LAUNCH_POWER;

export function isLaunchable(v: Vector): boolean {
  return Math.hypot(v.x, v.y) <= MAX_LAUNCH_SPEED + 1e-6;
}

// --------------------------------------------------------------------------

export interface SlingshotDeps {
  /** 새총 앵커(월드 좌표) */
  getAnchor(): Vector;
  /** 지금 새총에 얹혀 있는 새 (없으면 null) */
  getReadyBird(): Body | null;
  /** 비행 중인 새 (탭 능력 대상) */
  getFlyingBird(): Body | null;
  /** PLAYING 상태이고 드래그를 받아도 되는가 */
  isInteractive(): boolean;
  getGravity(): number;
  onLaunch(velocity: Vector): void;
  onTap(): void;
  onDragChange?(dragging: boolean): void;
}

export interface AimState {
  dragging: boolean;
  /** 앵커 기준 당김 벡터 */
  pull: Vector;
  /** 화면에 찍을 예측 점들(월드 좌표) */
  preview: Vector[];
  /** 0..1 — 고무줄 장력 표시용 */
  power: number;
}

export class SlingshotController {
  readonly aim: AimState = { dragging: false, pull: { x: 0, y: 0 }, preview: [], power: 0 };

  private pointerId: number | null = null;
  private attached = false;

  private readonly onPointerDown = (ev: PointerEvent): void => {
    if (!this.deps.isInteractive()) return;

    const world = this.toWorld(ev);

    // 비행 중이면 어디를 눌러도 능력 발동 시도(R12).
    if (this.deps.getFlyingBird()) {
      this.deps.onTap();
      return;
    }

    const bird = this.deps.getReadyBird();
    if (!bird) return;

    const anchor = this.deps.getAnchor();
    const distToBird = Vector.magnitude(Vector.sub(world, bird.position));
    const distToAnchor = Vector.magnitude(Vector.sub(world, anchor));
    if (Math.min(distToBird, distToAnchor) > GRAB_RADIUS) return;

    this.pointerId = ev.pointerId;
    this.aim.dragging = true;
    this.canvas.setPointerCapture(ev.pointerId);
    this.updateAim(world);
    this.deps.onDragChange?.(true);
    ev.preventDefault();
  };

  private readonly onPointerMove = (ev: PointerEvent): void => {
    if (!this.aim.dragging || ev.pointerId !== this.pointerId) return;
    this.updateAim(this.toWorld(ev));
    ev.preventDefault();
  };

  private readonly onPointerUp = (ev: PointerEvent): void => {
    if (!this.aim.dragging || ev.pointerId !== this.pointerId) return;

    const pull = this.aim.pull;
    const dist = Math.hypot(pull.x, pull.y);
    this.release(ev.pointerId);

    if (dist < MIN_PULL) return; // 오탭 — 새는 새총에 그대로 남는다
    this.deps.onLaunch(pullToVelocity(pull));
  };

  private readonly onPointerCancel = (ev: PointerEvent): void => {
    if (ev.pointerId !== this.pointerId) return;
    this.release(ev.pointerId);
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly deps: SlingshotDeps,
  ) {}

  attach(): void {
    if (this.attached) return;
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.attached = true;
  }

  /** R32: 씬을 내릴 때 리스너가 남으면 다음 씬에서 유령 입력이 된다. */
  detach(): void {
    if (!this.attached) return;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.attached = false;
    this.reset();
  }

  reset(): void {
    this.aim.dragging = false;
    this.aim.pull = { x: 0, y: 0 };
    this.aim.preview = [];
    this.aim.power = 0;
    this.pointerId = null;
  }

  private release(pointerId: number): void {
    if (this.canvas.hasPointerCapture?.(pointerId)) {
      this.canvas.releasePointerCapture(pointerId);
    }
    this.reset();
    this.deps.onDragChange?.(false);
  }

  private toWorld(ev: PointerEvent): Vector {
    const rect = this.canvas.getBoundingClientRect();
    return this.camera.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
  }

  private updateAim(world: Vector): void {
    const anchor = this.deps.getAnchor();
    const pull = clampPull(anchor, world);
    this.aim.pull = pull;
    this.aim.power = Math.min(1, Math.hypot(pull.x, pull.y) / MAX_PULL);

    const bird = this.deps.getReadyBird();
    const birdPos = { x: anchor.x + pull.x, y: anchor.y + pull.y };
    if (bird) Body.setPosition(bird, birdPos);

    this.aim.preview = predictPath(birdPos, pullToVelocity(pull), this.deps.getGravity());
  }
}
