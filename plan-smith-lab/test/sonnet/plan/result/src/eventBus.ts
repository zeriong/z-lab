// 레이어 간 통신용 단순 이벤트 버스 (발행/구독)
// Core/Game -> UI/Render 로 단방향 통지. UI는 Game 레이어를 직접 조작하지 않고
// 이 버스를 구독하거나 Game의 공개 메서드(pause/resume/restart 등)만 호출한다.

type Handler<T = any> = (payload: T) => void;

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on<T = any>(event: string, handler: Handler<T>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as Handler);
    return () => this.off(event, handler);
  }

  off<T = any>(event: string, handler: Handler<T>): void {
    this.listeners.get(event)?.delete(handler as Handler);
  }

  emit<T = any>(event: string, payload?: T): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
  }
}

export const bus = new EventBus();

// 이벤트 이름 상수 (오타 방지)
export const Events = {
  StateChanged: "state:changed",
  StageStarted: "stage:started",
  StagePaused: "game:paused",
  StageResumed: "game:resumed",
  StageCleared: "stage:cleared",
  StageFailed: "stage:failed",
  BirdLaunched: "bird:launched",
  BirdReady: "bird:ready",
  ScoreChanged: "score:changed",
  PigRemoved: "pig:removed",
  BlockDestroyed: "block:destroyed",
} as const;
