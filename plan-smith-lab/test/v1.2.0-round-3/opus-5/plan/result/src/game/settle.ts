/**
 * §7 정지(settle) 감지.
 * 여기를 대충 만들면 "돼지 다 죽었는데 결과창이 안 뜬다" / "굴러가는 도중에 실패 처리된다"가 나온다.
 */

import { Composite } from 'matter-js';
import type { GameWorld } from './world';

export const SETTLE_SPEED = 0.35; // px/step
export const SETTLE_ANG = 0.05; // rad/step
export const SETTLE_FRAMES = 45; // 0.75초 연속 유지
export const SETTLE_TIMEOUT = 300; // 5초 강제 종료

/** FLYING 중 새가 멈춘 것으로 보는 기준 */
export const BIRD_STOP_SPEED = 0.5;
export const BIRD_STOP_FRAMES = 30;
/** 발사 후 강제 SETTLING (엣지케이스 안전망) */
export const FLIGHT_TIMEOUT_STEPS = 720; // 12초 @60fps

export class Settle {
  private quietFrames = 0;
  private elapsed = 0;

  reset(): void {
    this.quietFrames = 0;
    this.elapsed = 0;
  }

  /** SETTLING 동안 매 스텝 호출. true면 정지 확정. */
  tick(gw: GameWorld): boolean {
    const quiet = Composite.allBodies(gw.engine.world).every(
      (b) =>
        b.isStatic ||
        b.isSleeping ||
        (b.speed < SETTLE_SPEED && b.angularSpeed < SETTLE_ANG),
    );
    this.quietFrames = quiet ? this.quietFrames + 1 : 0;
    this.elapsed++;
    return this.quietFrames >= SETTLE_FRAMES || this.elapsed >= SETTLE_TIMEOUT;
  }

  /** 디버그 표시용 */
  progress(): { quiet: number; elapsed: number } {
    return { quiet: this.quietFrames, elapsed: this.elapsed };
  }
}

/** FLYING 중 새가 소모됐는지(정지/화면밖/타임아웃) 판정한다. */
export class FlightWatcher {
  private stoppedFrames = 0;

  reset(): void {
    this.stoppedFrames = 0;
  }

  /** true면 이 새는 끝났다 → SETTLING */
  tick(gw: GameWorld, offWorld: boolean): boolean {
    const bird = gw.bird;
    if (!bird) return true; // 새가 이미 제거됐다면 끝난 것

    if (offWorld) return true;

    if (bird.speed < BIRD_STOP_SPEED) this.stoppedFrames++;
    else this.stoppedFrames = 0;

    if (this.stoppedFrames >= BIRD_STOP_FRAMES) return true;

    if (gw.launchStep >= 0 && gw.step - gw.launchStep > FLIGHT_TIMEOUT_STEPS) return true;

    return false;
  }
}
