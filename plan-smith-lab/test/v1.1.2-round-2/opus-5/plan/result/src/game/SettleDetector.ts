import { SETTLE } from '../data/materials';
import type { World } from '../physics/World';

/**
 * 정지(settle) 판정 (플랜 §5).
 * 모든 동적 바디가 speed<0.4 && angularSpeed<0.05 를 연속 30프레임 만족하거나 3.5초 타임아웃.
 * 이 규칙이 없으면 "아직 무너지는 중인데 실패 판정" 버그가 난다.
 */
export class SettleDetector {
  private quietFrames = 0;
  private elapsedMs = 0;
  private active = false;
  timedOut = false;

  /** 발사 직후 호출 */
  begin(): void {
    this.quietFrames = 0;
    this.elapsedMs = 0;
    this.active = true;
    this.timedOut = false;
  }

  reset(): void {
    this.active = false;
    this.quietFrames = 0;
    this.elapsedMs = 0;
    this.timedOut = false;
  }

  get running(): boolean {
    return this.active;
  }

  /** 정지로 판정되면 true (판정 후 자동으로 비활성) */
  update(world: World, stepMs: number): boolean {
    if (!this.active) return false;
    this.elapsedMs += stepMs;

    let quiet = true;
    world.forEachDynamic((_ref, speed, angularSpeed) => {
      if (speed >= SETTLE.speed || angularSpeed >= SETTLE.angularSpeed) quiet = false;
    });

    if (quiet) this.quietFrames++;
    else this.quietFrames = 0;

    if (this.quietFrames >= SETTLE.frames) {
      this.active = false;
      return true;
    }
    if (this.elapsedMs >= SETTLE.timeoutMs) {
      this.active = false;
      this.timedOut = true;
      return true;
    }
    return false;
  }
}
