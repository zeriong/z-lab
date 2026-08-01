/** DOM 오버레이용 초소형 헬퍼 (플랜 §1: UI는 캔버스가 아니라 DOM). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(label: string, className = 'btn'): HTMLButtonElement {
  const b = el('button', className, label);
  b.type = 'button';
  return b;
}

export function fmt(n: number): string {
  return n.toLocaleString('en-US');
}
