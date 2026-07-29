import Matter from 'matter-js';
import {
  GRAB_RADIUS,
  G_PER_STEP,
  LOGICAL_H,
  LOGICAL_W,
  MAX_PULL,
  PULL_TO_VELOCITY,
  TRAJECTORY_DOTS,
  TRAJECTORY_STEP_GAP,
} from './constants';
import { placeBird } from './physics';

const { Vector } = Matter;

/** 화면(클라이언트) 좌표 → 논리 좌표. DPR/CSS 스케일을 모두 흡수한다. */
export function toLogical(canvas: HTMLCanvasElement, clientX: number, clientY: number): Matter.Vector {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / LOGICAL_W, rect.height / LOGICAL_H);
  const offsetX = (rect.width - LOGICAL_W * scale) / 2;
  const offsetY = (rect.height - LOGICAL_H * scale) / 2;
  return {
    x: (clientX - rect.left - offsetX) / scale,
    y: (clientY - rect.top - offsetY) / scale,
  };
}

/**
 * 궤적 예측 (플랜 §5).
 * Matter의 속도 단위는 px/step 이므로 시간(초)이 아니라 스텝 수로 적분한다.
 *   v_{n+1} = v_n + g   /   p_{n+1} = p_n + v_{n+1}
 *   ⇒ p(n) = p0 + n·v0 + g·n(n+1)/2
 * 발사 코드와 동일한 상수(G_PER_STEP, PULL_TO_VELOCITY)를 쓰기 때문에
 * 충돌 전까지는 실제 비행과 일치한다.
 */
export function predictTrajectory(from: Matter.Vector, v0: Matter.Vector): Matter.Vector[] {
  const points: Matter.Vector[] = [];
  for (let i = 1; i <= TRAJECTORY_DOTS; i++) {
    const n = i * TRAJECTORY_STEP_GAP;
    const tri = (n * (n + 1)) / 2;
    const x = from.x + v0.x * n;
    const y = from.y + v0.y * n + G_PER_STEP * tri;
    if (y > LOGICAL_H + 40 || x > LOGICAL_W + 200) break;
    points.push({ x, y });
  }
  return points;
}

export interface SlingshotHost {
  /** 조준 입력을 받아도 되는 상태인가 (PLAYING) */
  canAim(): boolean;
  /** 앵커에 장전된 새 (없으면 null) */
  loadedBird(): Matter.Body | null;
  onLaunch(velocity: Matter.Vector): void;
}

export class Slingshot {
  anchor: Matter.Vector = { x: 0, y: 0 };
  dragging = false;
  /** 앵커 기준 당김 변위 (드래그 중에만 유효) */
  displacement: Matter.Vector = { x: 0, y: 0 };

  private pointerId: number | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private host: SlingshotHost,
  ) {
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('pointerleave', this.onCancel);
  }

  setAnchor(x: number, y: number): void {
    this.anchor = { x, y };
    this.cancelDrag();
  }

  /** 0..1 당김 세기 */
  get power(): number {
    return Math.min(1, Vector.magnitude(this.displacement) / MAX_PULL);
  }

  /** 현재 당김 상태에서의 발사 속도 */
  get launchVelocity(): Matter.Vector {
    return Vector.mult(this.displacement, -PULL_TO_VELOCITY);
  }

  /** 드래그 중 새가 있어야 할 위치 */
  get birdPosition(): Matter.Vector {
    return Vector.add(this.anchor, this.displacement);
  }

  trajectory(): Matter.Vector[] {
    if (!this.dragging || this.power < 0.05) return [];
    return predictTrajectory(this.birdPosition, this.launchVelocity);
  }

  cancelDrag(): void {
    if (this.dragging) {
      const bird = this.host.loadedBird();
      if (bird) placeBird(bird, this.anchor.x, this.anchor.y);
    }
    this.dragging = false;
    this.pointerId = null;
    this.displacement = { x: 0, y: 0 };
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('pointerleave', this.onCancel);
  }

  private onDown = (e: PointerEvent): void => {
    if (!this.host.canAim()) return;
    const bird = this.host.loadedBird();
    if (!bird) return;
    const p = toLogical(this.canvas, e.clientX, e.clientY);
    if (Vector.magnitude(Vector.sub(p, bird.position)) > GRAB_RADIUS) return;

    this.dragging = true;
    this.pointerId = e.pointerId;
    this.canvas.setPointerCapture?.(e.pointerId);
    this.updateDisplacement(p);
    e.preventDefault();
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    if (!this.host.canAim()) {
      this.cancelDrag();
      return;
    }
    this.updateDisplacement(toLogical(this.canvas, e.clientX, e.clientY));
    e.preventDefault();
  };

  private onUp = (e: PointerEvent): void => {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const velocity = this.launchVelocity;
    const power = this.power;
    this.dragging = false;
    this.pointerId = null;
    this.displacement = { x: 0, y: 0 };

    if (power < 0.08) {
      // 너무 약한 당김은 발사 취소하고 다시 장전 위치로
      const bird = this.host.loadedBird();
      if (bird) placeBird(bird, this.anchor.x, this.anchor.y);
      return;
    }
    this.host.onLaunch(velocity);
  };

  private onCancel = (e: PointerEvent): void => {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    this.cancelDrag();
  };

  private updateDisplacement(pointer: Matter.Vector): void {
    let d = Vector.sub(pointer, this.anchor);
    const len = Vector.magnitude(d);
    if (len > MAX_PULL) d = Vector.mult(d, MAX_PULL / len);
    this.displacement = d;

    const bird = this.host.loadedBird();
    if (bird) {
      const pos = this.birdPosition;
      placeBird(bird, pos.x, pos.y);
    }
  }
}
