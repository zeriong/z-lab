/**
 * §11 카메라. 렌더는 ctx.translate(-camera.x, 0) 한 번으로 처리한다.
 * 월드 폭 > 1280일 때만 팬한다.
 */

import type { Body } from 'matter-js';
import { LOGICAL_W } from '../core/input';

export const FOLLOW_OFFSET = 480; // 화면 좌표 기준 새를 두고 싶은 x
const FOLLOW_LERP = 0.12;
const RETURN_LERP = 0.15;

export class Camera {
  x = 0;
  private worldWidth = LOGICAL_W;

  setWorldWidth(w: number): void {
    this.worldWidth = w;
    this.x = this.clamp(this.x);
  }

  reset(): void {
    this.x = 0;
  }

  private clamp(x: number): number {
    const max = Math.max(0, this.worldWidth - LOGICAL_W);
    return Math.max(0, Math.min(max, x));
  }

  /** FLYING: 새를 따라간다. */
  follow(bird: Body | null): void {
    if (!bird) return;
    const target = this.clamp(bird.position.x - FOLLOW_OFFSET);
    this.x += (target - this.x) * FOLLOW_LERP;
  }

  /** AIMING: 슬링샷 화면(0)으로 복귀 */
  returnHome(): void {
    this.x += (0 - this.x) * RETURN_LERP;
    if (Math.abs(this.x) < 0.5) this.x = 0;
  }

  /** SETTLING: 마지막 위치 유지 (아무것도 하지 않는다) */
  hold(): void {
    /* intentionally empty — §11 */
  }
}
