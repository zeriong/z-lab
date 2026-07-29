// Single publish/subscribe channel used for cross-layer communication
// (Core/Game -> UI), per the plan's "레이어 간 통신은 단순 이벤트 버스 하나로 통일" rule.
class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((h) => h !== handler);
  }

  emit(event, payload) {
    if (!this.listeners[event]) return;
    // snapshot so a handler unsubscribing mid-emit doesn't break iteration
    this.listeners[event].slice().forEach((handler) => handler(payload));
  }
}

export const eventBus = new EventBus();
