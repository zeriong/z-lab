// Tab strip state. A key is both the React key and the URL state (`?tabs=t1,t3`).

export function createTabs() {
  return { next: 1, tabs: [] };
}

export function openTab(state, title) {
  const key = `t${state.next}`;
  return { next: state.next + 1, tabs: [...state.tabs, { key, title }] };
}

export function closeTab(state, key) {
  return { ...state, tabs: state.tabs.filter((tab) => tab.key !== key) };
}

export function toQuery(state) {
  return state.tabs.map((tab) => tab.key).join(",");
}
