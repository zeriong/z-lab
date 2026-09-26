/**
 * 상태 머신 (§5). 전이표에 없는 전이는 거부한다. 진입/이탈 훅 지원.
 */

export type GameState =
  | 'MainMenu'
  | 'StageSelect'
  | 'Playing'
  | 'Paused'
  | 'StageClear'
  | 'StageFailed';

/** §5 다이어그램의 전이표 */
export const GAME_TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = Object.freeze({
  MainMenu: ['Playing', 'StageSelect'],
  StageSelect: ['Playing', 'MainMenu'],
  Playing: ['Paused', 'StageClear', 'StageFailed'],
  Paused: ['Playing', 'MainMenu'],
  StageClear: ['Playing', 'MainMenu'],
  StageFailed: ['Playing', 'MainMenu'],
});

export type Hook<S> = (from: S, to: S) => void;

export class StateMachine<S extends string> {
  private enterHooks = new Map<S, Set<Hook<S>>>();
  private exitHooks = new Map<S, Set<Hook<S>>>();
  private anyHooks = new Set<Hook<S>>();

  constructor(
    public state: S,
    private readonly table: Readonly<Record<S, readonly S[]>>,
  ) {}

  can(to: S): boolean {
    return this.table[this.state]?.includes(to) ?? false;
  }

  /** 전이 성공 시 true. 전이표에 없으면 false 를 돌려주고 아무것도 하지 않는다. */
  transition(to: S): boolean {
    if (!this.can(to)) return false;
    const from = this.state;
    this.exitHooks.get(from)?.forEach((h) => h(from, to));
    this.state = to;
    this.enterHooks.get(to)?.forEach((h) => h(from, to));
    this.anyHooks.forEach((h) => h(from, to));
    return true;
  }

  onEnter(state: S, hook: Hook<S>): () => void {
    let set = this.enterHooks.get(state);
    if (!set) this.enterHooks.set(state, (set = new Set()));
    set.add(hook);
    return () => set.delete(hook);
  }

  onExit(state: S, hook: Hook<S>): () => void {
    let set = this.exitHooks.get(state);
    if (!set) this.exitHooks.set(state, (set = new Set()));
    set.add(hook);
    return () => set.delete(hook);
  }

  onChange(hook: Hook<S>): () => void {
    this.anyHooks.add(hook);
    return () => this.anyHooks.delete(hook);
  }

  is(...states: S[]): boolean {
    return states.includes(this.state);
  }
}
