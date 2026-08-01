/**
 * 계측 오버레이 (?stats=1) — 완료 기준 2·4 측정 도구 (플랜 §8).
 * 평균 fps / 1% low / 바디 수 / 누적 물리 스텝 / 마지막 프레임 dt.
 */
export class Stats {
  private el: HTMLDivElement | null = null;
  private samples: number[] = [];
  private readonly cap = 600; // 10초 @60fps
  private lastPaint = 0;

  bodies = 0;
  physicsSteps = 0;
  stateLabel = '';

  constructor(
    private readonly active: boolean,
    parent: HTMLElement | null = null,
  ) {
    if (!active) return;
    const el = document.createElement('div');
    el.className = 'stats';
    el.textContent = 'stats…';
    (parent ?? document.body).appendChild(el);
    this.el = el;
  }

  frame(frameMs: number): void {
    if (!this.active) return;
    this.samples.push(frameMs);
    if (this.samples.length > this.cap) this.samples.shift();

    const now = performance.now();
    if (now - this.lastPaint < 250) return;
    this.lastPaint = now;

    const sorted = this.samples.slice().sort((a, b) => a - b);
    const avg = this.samples.reduce((a, b) => a + b, 0) / Math.max(1, this.samples.length);
    const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))] ?? avg;
    const fps = 1000 / Math.max(0.0001, avg);
    const low = 1000 / Math.max(0.0001, p99);

    if (this.el) {
      this.el.textContent =
        `state   ${this.stateLabel}\n` +
        `fps avg ${fps.toFixed(1)}\n` +
        `1% low  ${low.toFixed(1)}\n` +
        `frame   ${frameMs.toFixed(1)}ms\n` +
        `bodies  ${this.bodies}\n` +
        `steps   ${this.physicsSteps}`;
    }
  }
}
