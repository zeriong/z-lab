import Matter from 'matter-js';
import {
  BIRD_SPECS,
  GRAB_RADIUS,
  GROUND_Y,
  G_STEP,
  LAUNCH_POWER,
  MAX_PULL,
  MIN_PULL,
  SLING_X,
  SLING_Y,
  type BirdType,
} from '../core/constants.ts';
import type { Stage } from './Stage.ts';

const { Body } = Matter;

export interface Vec {
  x: number;
  y: number;
}

// 발사 속도 = (앵커 - 놓은 위치) × 강성 계수 × 새 타입 배율. 순수 함수 — 검증 하네스와 공유.
export function launchVelocity(pull: Vec, type: BirdType): Vec {
  const mult = LAUNCH_POWER * BIRD_SPECS[type].powerMult;
  return { x: pull.x * mult, y: pull.y * mult };
}

// 궤적 예측: 실제 물리와 동일 공식(공기저항 없음, 스텝당 v.y += G_STEP; pos += v).
// 충돌 이후는 예측하지 않는다.
export function trajectoryPoints(start: Vec, velocity: Vec, maxPoints = 15): Vec[] {
  const pts: Vec[] = [];
  let { x, y } = start;
  let vx = velocity.x;
  let vy = velocity.y;
  const stepsPerPoint = 4;
  for (let i = 0; i < maxPoints * stepsPerPoint; i++) {
    vy += G_STEP;
    x += vx;
    y += vy;
    if (y > GROUND_Y) break;
    if ((i + 1) % stepsPerPoint === 0) pts.push({ x, y });
  }
  return pts;
}

// 드래그 입력: 포인터 다운이 새총 근처에서 시작되면 드래그 모드.
// 드래그 중에는 새를 kinematic(static)으로 두고, 릴리즈 순간 setVelocity를 준다.
export class Slingshot {
  readonly anchor: Vec = { x: SLING_X, y: SLING_Y };
  dragging = false;

  private stage: Stage;
  private toVirtual: (clientX: number, clientY: number) => Vec;
  private enabled: () => boolean;

  constructor(
    canvas: HTMLCanvasElement,
    stage: Stage,
    toVirtual: (clientX: number, clientY: number) => Vec,
    enabled: () => boolean,
  ) {
    this.stage = stage;
    this.toVirtual = toVirtual;
    this.enabled = enabled;

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled() || this.stage.phase !== 'aim' || !this.stage.currentBird) return;
      const p = this.toVirtual(e.clientX, e.clientY);
      const bird = this.stage.currentBird.body.position;
      if (dist(p, bird) > GRAB_RADIUS && dist(p, this.anchor) > GRAB_RADIUS) return;
      this.dragging = true;
      canvas.setPointerCapture(e.pointerId);
      this.moveTo(p);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      if (!this.enabled() || this.stage.phase !== 'aim') {
        this.cancelDrag();
        return;
      }
      this.moveTo(this.toVirtual(e.clientX, e.clientY));
    });

    const release = (e: PointerEvent) => {
      if (!this.dragging) return;
      this.dragging = false;
      if (!this.enabled() || this.stage.phase !== 'aim' || !this.stage.currentBird) return;
      this.moveTo(this.toVirtual(e.clientX, e.clientY));
      const birdPos = this.stage.currentBird.body.position;
      const pull = { x: this.anchor.x - birdPos.x, y: this.anchor.y - birdPos.y };
      if (Math.hypot(pull.x, pull.y) < MIN_PULL) {
        this.resetBird();
        return;
      }
      this.stage.fire(launchVelocity(pull, this.stage.currentBird.type));
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', () => this.cancelDrag());
  }

  cancelDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.resetBird();
  }

  // 드래그 중 새 위치: 새총 기준 최대 당김 반경으로 클램프
  private moveTo(p: Vec): void {
    const bird = this.stage.currentBird;
    if (!bird) return;
    let dx = p.x - this.anchor.x;
    let dy = p.y - this.anchor.y;
    const len = Math.hypot(dx, dy);
    if (len > MAX_PULL) {
      dx = (dx / len) * MAX_PULL;
      dy = (dy / len) * MAX_PULL;
    }
    Body.setPosition(bird.body, { x: this.anchor.x + dx, y: this.anchor.y + dy });
  }

  private resetBird(): void {
    const bird = this.stage.currentBird;
    if (bird) Body.setPosition(bird.body, { x: this.anchor.x, y: this.anchor.y });
  }

  // 렌더러가 쓰는 조준 정보 (드래그 중일 때만 궤적을 반환)
  getAimInfo(): { birdPos: Vec; trajectory: Vec[] } | null {
    const bird = this.stage.currentBird;
    if (!this.dragging || !bird) return null;
    const birdPos = bird.body.position;
    const pull = { x: this.anchor.x - birdPos.x, y: this.anchor.y - birdPos.y };
    if (Math.hypot(pull.x, pull.y) < MIN_PULL) {
      return { birdPos: { x: birdPos.x, y: birdPos.y }, trajectory: [] };
    }
    const v = launchVelocity(pull, bird.type);
    return {
      birdPos: { x: birdPos.x, y: birdPos.y },
      trajectory: trajectoryPoints({ x: birdPos.x, y: birdPos.y }, v),
    };
  }
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
