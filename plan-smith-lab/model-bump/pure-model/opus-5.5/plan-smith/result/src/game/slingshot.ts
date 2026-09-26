// 새총 상태: EMPTY → LOADED → DRAGGING → (발사) EMPTY (§4.4)
// 새총 위의 새는 물리 월드에 넣지 않고 그림으로만 둔다.
import { ANCHOR, BIRDS, GRAB_RADIUS, GROUND_Y, MAX_PULL, MIN_PULL } from '../config';
import type { BirdType, SlingState, Vec2 } from '../types';

/** pull 길이를 MAX_PULL로 자르고, 당긴 새가 땅에 파묻히지 않게 y를 제한한다 */
export function clampPull(raw: Vec2, birdRadius: number): Vec2 {
  let x = raw.x;
  let y = raw.y;
  const len = Math.hypot(x, y);
  if (len > MAX_PULL) {
    x = (x / len) * MAX_PULL;
    y = (y / len) * MAX_PULL;
  }
  // 새 위치 = ANCHOR − pull. 새 바닥이 땅 위에 있도록
  const minPullY = ANCHOR.y - (GROUND_Y - birdRadius - 2);
  if (y < minPullY) y = minPullY;
  return { x, y };
}

export class Slingshot {
  state: SlingState = 'EMPTY';
  birdType: BirdType | null = null;
  pull: Vec2 = { x: 0, y: 0 };
  pointerId: number | null = null;
  /** 궤적 예측 점 (DRAGGING 중에만 채워짐) */
  preview: Vec2[] = [];

  load(type: BirdType): void {
    this.state = 'LOADED';
    this.birdType = type;
    this.pull = { x: 0, y: 0 };
    this.pointerId = null;
    this.preview = [];
  }

  empty(): void {
    this.state = 'EMPTY';
    this.birdType = null;
    this.pull = { x: 0, y: 0 };
    this.pointerId = null;
    this.preview = [];
  }

  radius(): number {
    return this.birdType ? BIRDS[this.birdType].radius : 22;
  }

  /** 새가 그려지는 위치 = anchor − pull */
  birdPosition(): Vec2 {
    return { x: ANCHOR.x - this.pull.x, y: ANCHOR.y - this.pull.y };
  }

  canGrab(p: Vec2): boolean {
    if (this.state !== 'LOADED') return false;
    const b = this.birdPosition();
    return Math.hypot(p.x - b.x, p.y - b.y) <= GRAB_RADIUS;
  }

  grab(p: Vec2, pointerId: number | null = null): boolean {
    if (!this.canGrab(p)) return false;
    this.state = 'DRAGGING';
    this.pointerId = pointerId;
    this.drag(p);
    return true;
  }

  /** pull = anchor − pointer, 최대 120 */
  drag(p: Vec2): void {
    if (this.state !== 'DRAGGING') return;
    this.pull = clampPull({ x: ANCHOR.x - p.x, y: ANCHOR.y - p.y }, this.radius());
  }

  /** 놓기. |pull| ≥ 15면 발사할 pull을 돌려주고, 아니면 취소하고 null */
  release(): Vec2 | null {
    if (this.state !== 'DRAGGING') return null;
    const pull = { ...this.pull };
    if (Math.hypot(pull.x, pull.y) < MIN_PULL) {
      this.cancel();
      return null;
    }
    return pull;
  }

  /** DRAGGING → LOADED (pointercancel, 일시정지) */
  cancel(): void {
    if (this.state !== 'DRAGGING') return;
    this.state = 'LOADED';
    this.pull = { x: 0, y: 0 };
    this.pointerId = null;
    this.preview = [];
  }
}
