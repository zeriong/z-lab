// 상태 머신: 전이 표에 있는 것만 허용하고 나머지는 무시(방어적 no-op).
export type StateName = 'MainMenu' | 'Playing' | 'Paused' | 'StageClear' | 'StageFailed';

export interface StateHandler {
  onEnter?(from: StateName | null): void;
  onExit?(to: StateName): void;
}

// 허용 전이 표 — plan §3의 화살표 그대로 (+ 결과 화면에서 메인으로).
const ALLOWED: Record<StateName, StateName[]> = {
  MainMenu: ['Playing'],
  Playing: ['Paused', 'StageClear', 'StageFailed'],
  Paused: ['Playing', 'MainMenu'],
  StageClear: ['Playing', 'MainMenu'],
  StageFailed: ['Playing', 'MainMenu'],
};

export class StateMachine {
  private state: StateName = 'MainMenu';
  private handlers = new Map<StateName, StateHandler>();

  register(name: StateName, handler: StateHandler): void {
    this.handlers.set(name, handler);
  }

  get current(): StateName {
    return this.state;
  }

  is(name: StateName): boolean {
    return this.state === name;
  }

  // 시작 상태 진입(onEnter 호출용)
  start(): void {
    this.handlers.get(this.state)?.onEnter?.(null);
  }

  // 표에 없는 전이는 false를 반환하고 아무 일도 하지 않는다.
  transition(to: StateName): boolean {
    if (!ALLOWED[this.state].includes(to)) return false;
    const from = this.state;
    this.handlers.get(from)?.onExit?.(to);
    this.state = to;
    this.handlers.get(to)?.onEnter?.(from);
    return true;
  }
}
