// B8: 발사체 추적 카메라. x만 움직이고 월드 [0, WORLD.w - VIEW.w]에 클램프, 정착 후 슬링샷으로 복귀.
import { VIEW, WORLD, type Vec2 } from './types';

export const CAMERA_LERP = 0.1;
export const CAMERA_MAX_X = WORLD.w - VIEW.w;

export class Camera {
  /** 현재 카메라 좌상단 x(월드 좌표). */
  x = 0;
  /** 추적 목표 x. */
  target = 0;
  private followTarget: (() => Vec2 | null) | null = null;

  constructor(private readonly homeX = 0) {
    this.x = homeX;
    this.target = homeX;
  }

  /** 새(또는 임의 위치 공급자)를 따라간다. null을 돌려주면 추적을 멈춘다. */
  follow(getPos: (() => Vec2 | null) | null): void {
    this.followTarget = getPos;
  }

  /** 정착 후 슬링샷으로 복귀. */
  returnHome(): void {
    this.followTarget = null;
    this.target = this.homeX;
  }

  reset(): void {
    this.followTarget = null;
    this.x = this.homeX;
    this.target = this.homeX;
  }

  static clamp(x: number): number {
    return Math.min(CAMERA_MAX_X, Math.max(0, x));
  }

  update(): void {
    if (this.followTarget) {
      const p = this.followTarget();
      if (p) this.target = Camera.clamp(p.x - VIEW.w * 0.4);
    }
    this.x += (this.target - this.x) * CAMERA_LERP;
    if (Math.abs(this.target - this.x) < 0.05) this.x = this.target;
    this.x = Camera.clamp(this.x);
  }
}
