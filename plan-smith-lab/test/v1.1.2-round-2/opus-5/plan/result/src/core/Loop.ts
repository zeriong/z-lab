/**
 * 고정 timestep 루프 (플랜 §2).
 * - 물리는 1/60 고정 스텝, 렌더는 가변.
 * - 프레임당 최대 3스텝으로 클램프 (저사양 스파이럴 방지).
 * - reset()으로 accumulator를 비운다 → PAUSED 진입/복귀 시 순간이동 버그 차단 (플랜 §3).
 */
export type StepFn = (stepMs: number) => void;
export type RenderFn = (frameMs: number) => void;

export class Loop {
  readonly stepMs = 1000 / 60;
  readonly maxStepsPerFrame = 3;

  private acc = 0;
  private last = 0;
  private raf = 0;
  private running = false;

  /** 이번 프레임에 실행된 물리 스텝 수 (완료 기준 4 계측용) */
  lastFrameSteps = 0;
  /** 마지막 프레임의 실측 dt (완료 기준 4: 재개 첫 프레임 dt ≤ 33ms) */
  lastFrameMs = 0;

  constructor(
    private readonly onStep: StepFn,
    private readonly onRender: RenderFn,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** accumulator를 비우고 시간 기준점을 현재로 맞춘다. */
  reset(): void {
    this.acc = 0;
    this.last = performance.now();
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);

    let frameMs = now - this.last;
    this.last = now;
    // 탭 복귀/브레이크포인트로 dt가 폭주하면 한 스텝으로 취급한다.
    if (frameMs > 250 || frameMs < 0) frameMs = this.stepMs;
    this.lastFrameMs = frameMs;

    this.acc += frameMs;
    let steps = 0;
    while (this.acc >= this.stepMs && steps < this.maxStepsPerFrame) {
      this.onStep(this.stepMs);
      this.acc -= this.stepMs;
      steps++;
    }
    // 클램프에 걸렸으면 밀린 시간을 버린다(따라잡기 시도 = 순간이동).
    if (steps === this.maxStepsPerFrame) this.acc = 0;
    this.lastFrameSteps = steps;

    this.onRender(frameMs);
  };
}
