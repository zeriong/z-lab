/**
 * PhysicsLoop — 고정 타임스텝 누산기 (§7.1)
 *
 * dt = 1000/60ms. 프레임 간 실제 경과를 누산기에 더하고 dt 단위로 소비하되
 * 한 프레임 최대 5스텝(= 83ms)까지만 소비하고 남는 시간은 버린다.
 * 상한이 없으면 탭 비활성 복귀 시 수백 스텝이 한 프레임에 몰려 폭주한다.
 *
 * pause()는 누산기를 0으로 만든다(§5, §10 콜드스타트 표). 이게 없으면
 * 재개하는 순간 멈춰 있던 시간이 한꺼번에 적분되어 바디가 순간이동한다.
 */

export const STEP_MS = 1000 / 60;
export const MAX_STEPS_PER_FRAME = 5;

export class PhysicsLoop {
  private accumulator = 0;
  private paused = false;
  /** 진단용: 마지막 프레임에서 실제로 소비한 스텝 수 */
  lastSteps = 0;
  /** 진단용: 상한에 걸려 버린 시간의 누계(ms) */
  droppedMs = 0;

  constructor(
    readonly stepMs: number = STEP_MS,
    readonly maxSteps: number = MAX_STEPS_PER_FRAME,
  ) {}

  get isPaused(): boolean {
    return this.paused;
  }

  get pendingMs(): number {
    return this.accumulator;
  }

  pause(): void {
    this.paused = true;
    this.accumulator = 0;
  }

  resume(): void {
    this.paused = false;
    this.accumulator = 0;
  }

  reset(): void {
    this.accumulator = 0;
    this.lastSteps = 0;
    this.droppedMs = 0;
  }

  /**
   * 경과 시간을 먹여 고정 스텝을 꺼낸다.
   * @returns 이번 호출에서 실행된 스텝 수 (PAUSED면 항상 0)
   */
  tick(elapsedMs: number, step: (dt: number) => void): number {
    if (this.paused) {
      this.lastSteps = 0;
      return 0;
    }

    // NaN/음수/거대값 방어: 탭 복귀 시 elapsed가 수 초로 튀는 것을 여기서 자른다.
    const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
    this.accumulator += safeElapsed;

    let steps = 0;
    while (this.accumulator >= this.stepMs && steps < this.maxSteps) {
      this.accumulator -= this.stepMs;
      steps += 1;
      step(this.stepMs);
    }

    if (this.accumulator >= this.stepMs) {
      // 상한 초과분은 버린다. 따라잡지 않는 편이 폭주보다 낫다.
      this.droppedMs += this.accumulator;
      this.accumulator = 0;
    }

    this.lastSteps = steps;
    return steps;
  }
}
