// 화면 모듈 공용 DOM 헬퍼. 버튼은 DOM 요소로 캔버스 위에 절대 배치(포인터 접근성·터치 히트 영역, 계획서 단계 6).

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

export function button(id: string, label: string, cls = 'btn', onClick?: () => void): HTMLButtonElement {
  const b = el('button', { id, class: cls, type: 'button', text: label });
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

export function starsText(stars: number): string {
  const n = Math.max(0, Math.min(3, stars));
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}
