// B10 — 카메라(추적·복귀)
//
// 발사체가 화면 우측 40% 지점을 넘으면 수평으로 따라가고,
// 턴이 끝나면 0.4초 안에 슬링샷 뷰로 복귀한다.

import { VIRTUAL_W } from '../physics/units';
import type { World } from './world';

const FOLLOW_EDGE = 0.6; // 화면 좌측 기준 60% 지점 = 우측 40% 경계
const RETURN_SEC = 0.4;

export class Camera {
  x = 0;
  private returnFrom = 0;
  private returnT = -1;

  reset(): void {
    this.x = 0;
    this.returnT = -1;
  }

  private clamp(world: World, v: number): number {
    const max = Math.max(0, world.worldWidth - VIRTUAL_W);
    return Math.max(0, Math.min(max, v));
  }

  update(world: World, dtSec: number): void {
    const bird = world.activeBird;
    const flying = world.turnPhase === 'FLYING' || world.turnPhase === 'SETTLING';

    if (bird && bird.alive && flying) {
      this.returnT = -1;
      const edge = this.x + VIRTUAL_W * FOLLOW_EDGE;
      if (bird.x > edge) {
        this.x = this.clamp(world, bird.x - VIRTUAL_W * FOLLOW_EDGE);
      }
      return;
    }

    if (world.turnPhase === 'AIMING' && this.x > 0.5) {
      if (this.returnT < 0) {
        this.returnT = 0;
        this.returnFrom = this.x;
      }
      this.returnT += dtSec;
      const k = Math.min(1, this.returnT / RETURN_SEC);
      const eased = 1 - (1 - k) * (1 - k);
      this.x = this.returnFrom * (1 - eased);
      if (k >= 1) {
        this.x = 0;
        this.returnT = -1;
      }
    }
  }
}
