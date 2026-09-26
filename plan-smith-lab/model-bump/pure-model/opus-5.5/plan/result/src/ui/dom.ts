/** 작은 DOM 헬퍼 */
export type Attrs = Record<string, string | number | boolean | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else if (k === 'testid') node.setAttribute('data-testid', String(v));
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) node.append(c);
  return node;
}

export function button(label: string, testid: string, onClick: () => void, extraClass = ''): HTMLButtonElement {
  const b = el('button', { type: 'button', class: `btn ${extraClass}`.trim(), testid }, [label]);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled) return;
    onClick();
  });
  return b;
}

export function setVisible(node: HTMLElement, visible: boolean): void {
  node.classList.toggle('is-hidden', !visible);
  node.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

export function isVisible(node: HTMLElement): boolean {
  return !node.classList.contains('is-hidden');
}

export function starText(stars: number): string {
  return '★'.repeat(Math.max(0, Math.min(3, stars))) + '☆'.repeat(3 - Math.max(0, Math.min(3, stars)));
}

export function formatScore(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}
