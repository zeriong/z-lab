// C3/D1: requestAnimationFrame 루프. 상태가 PLAYING일 때만 고정 스텝(1000/60) 한 번. 경과시간은 쓰지 않는다.
import type Matter from 'matter-js';
import { stepEngine } from './physics';
import type { StateMachine } from './state';

export interface LoopHooks {
  /** 물리 스텝 직후(PLAYING에서만). 판정·카메라·파티클 갱신. */
  afterStep?(): void;
  /** 매 프레임(상태 무관). 렌더. */
  render?(): void;
}

type RafLike = (cb: (t: number) => void) => number;
type CafLike = (id: number) => void;

export class GameLoop {
  private rafId: number | null = null;
  private running = false;

  constructor(
    private readonly engine: Matter.Engine,
    private readonly state: StateMachine,
    private readonly hooks: LoopHooks = {},
    private readonly raf: RafLike = (cb) => window.requestAnimationFrame(cb),
    private readonly caf: CafLike = (id) => window.cancelAnimationFrame(id),
  ) {}

  /** 한 프레임. 테스트에서 직접 호출 가능. PAUSED면 엔진을 건드리지 않는다. */
  tick(): void {
    if (this.state.state === 'PLAYING') {
      stepEngine(this.engine);
      this.hooks.afterStep?.();
    }
    this.hooks.render?.();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const frame = () => {
      if (!this.running) return;
      this.tick();
      this.rafId = this.raf(frame);
    };
    this.rafId = this.raf(frame);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      this.caf(this.rafId);
      this.rafId = null;
    }
  }

  get isRunning(): boolean {
    return this.running;
  }
}

export function createLoop(engine: Matter.Engine, state: StateMachine, hooks: LoopHooks = {}): GameLoop {
  return new GameLoop(engine, state, hooks);
}
