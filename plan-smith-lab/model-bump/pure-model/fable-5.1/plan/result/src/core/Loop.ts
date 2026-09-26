/**
 * rAF + 고정 스텝 누산기 (§3.4, §4.3).
 * - 프레임 간격은 100ms 로 캡, 프레임당 최대 5스텝.
 * - shouldStep() 이 false 면(일시정지·오버레이) 스텝을 소비하지 않고 렌더만 한다.
 * - 재개 시 resetAccumulator() 로 밀린 시간을 버린다.
 */
import { FRAME_DELTA_CAP_MS, MAX_STEPS_PER_FRAME, STEP_MS } from './config';

export interface LoopOptions {
  step: () => void;
  render: () => void;
  shouldStep: () => boolean;
  stepMs?: number;
}

export class Loop {
  running = false;
  /** 최근 프레임 시간(ms), 지수 이동 평균 */
  frameMs = 0;
  fps = 0;

  private acc = 0;
  private last = 0;
  private raf = 0;
  private readonly stepMs: number;

  constructor(private readonly opts: LoopOptions) {
    this.stepMs = opts.stepMs ?? STEP_MS;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.acc = 0;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  resetAccumulator(): void {
    this.acc = 0;
    this.last = performance.now();
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const t0 = performance.now();
    let dt = now - this.last;
    this.last = now;
    if (dt > FRAME_DELTA_CAP_MS) dt = FRAME_DELTA_CAP_MS;
    if (dt < 0) dt = 0;

    if (this.opts.shouldStep()) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= this.stepMs && n < MAX_STEPS_PER_FRAME) {
        this.opts.step();
        this.acc -= this.stepMs;
        n++;
      }
      // 따라잡기를 포기: 스파이럴 방지
      if (n === MAX_STEPS_PER_FRAME) this.acc = 0;
    } else {
      this.acc = 0;
    }

    this.opts.render();

    const cost = performance.now() - t0;
    this.frameMs = this.frameMs === 0 ? cost : this.frameMs * 0.9 + cost * 0.1;
    this.fps = dt > 0 ? (this.fps === 0 ? 1000 / dt : this.fps * 0.9 + (1000 / dt) * 0.1) : this.fps;

    this.raf = requestAnimationFrame(this.frame);
  };
}
