import { SLING } from '../data/materials';
import type { Vec2 } from '../core/Camera';

/**
 * 슬링샷 입력 (플랜 §5).
 * pull = clamp(anchor - pointer, maxPull)
 * impulse = normalize(pull) * (|pull| / maxPull) * maxSpeed
 * pointercancel/창 밖 릴리즈는 취소가 아니라 그 시점 값으로 발사한다(모바일 체감).
 */
export class Slingshot {
  readonly anchor: Vec2;
  pulling = false;
  pull: Vec2 = { x: 0, y: 0 };

  constructor(anchor: Vec2) {
    this.anchor = { x: anchor.x, y: anchor.y };
  }

  /** 새를 잡았는지: 반경 × 1.8 관용 히트테스트 */
  tryGrab(point: Vec2, birdRadius: number): boolean {
    const bp = this.birdPos;
    const dx = point.x - bp.x;
    const dy = point.y - bp.y;
    const r = birdRadius * SLING.grabRadiusFactor;
    if (dx * dx + dy * dy <= r * r) {
      this.pulling = true;
      return true;
    }
    return false;
  }

  drag(point: Vec2): void {
    if (!this.pulling) return;
    let px = this.anchor.x - point.x;
    let py = this.anchor.y - point.y;
    const len = Math.hypot(px, py);
    if (len > SLING.maxPull) {
      const k = SLING.maxPull / len;
      px *= k;
      py *= k;
    }
    this.pull = { x: px, y: py };
  }

  /** 발사 속도(px/step). 당김이 거의 없으면 null(발사 안 함) */
  releaseVelocity(): Vec2 | null {
    const len = Math.hypot(this.pull.x, this.pull.y);
    if (len < 6) return null;
    const power = Math.min(1, len / SLING.maxPull);
    const speed = power * SLING.maxSpeed;
    return { x: (this.pull.x / len) * speed, y: (this.pull.y / len) * speed };
  }

  /** 새가 지금 있어야 할 위치 (anchor - pull) */
  get birdPos(): Vec2 {
    return { x: this.anchor.x - this.pull.x, y: this.anchor.y - this.pull.y };
  }

  get power(): number {
    return Math.min(1, Math.hypot(this.pull.x, this.pull.y) / SLING.maxPull);
  }

  reset(): void {
    this.pulling = false;
    this.pull = { x: 0, y: 0 };
  }
}
