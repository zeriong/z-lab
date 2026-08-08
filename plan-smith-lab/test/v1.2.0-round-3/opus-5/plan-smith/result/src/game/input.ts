// B7 — 슬링샷 드래그 입력(마우스·포인터)
//
// 당긴 거리·각도가 화면에서 즉시 읽히고 상한(최대 당김 거리)이 눈에 보인다.
// 입력 가드는 상태 머신이 쥐고 있고, 이 모듈은 "허용된 뒤에만" 호출된다.

import { MIN_DRAG_PX } from '../physics/units';
import { dragBird, releaseBird, resetBirdToSling } from './launch';
import { birdRestPosition } from './world';
import type { World } from './world';

/** 새를 집을 수 있는 반경(px). 손가락·마우스 모두에서 잡기 쉬운 크기. */
const GRAB_RADIUS = 96;

export class SlingInput {
  dragActive = false;
  dragX = 0;
  dragY = 0;
  private pointerId: number | null = null;

  reset(): void {
    this.dragActive = false;
    this.dragX = 0;
    this.dragY = 0;
    this.pointerId = null;
  }

  /** worldX/worldY 는 카메라 보정을 마친 월드 좌표. */
  pointerDown(world: World, worldX: number, worldY: number, pointerId: number): boolean {
    if (world.turnPhase !== 'AIMING' || !world.birdOnSling) return false;
    const rest = birdRestPosition(world.def);
    if (Math.hypot(worldX - rest.x, worldY - rest.y) > GRAB_RADIUS) return false;

    this.dragActive = true;
    this.pointerId = pointerId;
    this.dragX = 0;
    this.dragY = 0;
    return true;
  }

  pointerMove(world: World, worldX: number, worldY: number, pointerId: number): void {
    if (!this.dragActive || this.pointerId !== pointerId) return;
    const rest = birdRestPosition(world.def);
    this.dragX = worldX - rest.x;
    this.dragY = worldY - rest.y;
    dragBird(world, this.dragX, this.dragY);
  }

  /** 릴리즈. 실제로 발사됐으면 true. */
  pointerUp(world: World, pointerId: number): boolean {
    if (!this.dragActive || this.pointerId !== pointerId) return false;
    const dx = this.dragX;
    const dy = this.dragY;
    this.reset();

    if (Math.hypot(dx, dy) < MIN_DRAG_PX) {
      resetBirdToSling(world);
      return false;
    }
    return releaseBird(world, dx, dy);
  }

  cancel(world: World): void {
    if (!this.dragActive) return;
    this.reset();
    resetBirdToSling(world);
  }
}
