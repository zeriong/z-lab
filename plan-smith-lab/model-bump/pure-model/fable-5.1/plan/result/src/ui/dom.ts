/** 작은 DOM 헬퍼. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function button(label: string, className = '', onClick?: () => void): HTMLButtonElement {
  const b = el('button', `btn ${className}`.trim(), label);
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

export function show(node: HTMLElement): void {
  node.classList.remove('hidden');
}

export function hide(node: HTMLElement): void {
  node.classList.add('hidden');
}

export function starsMarkup(stars: number): HTMLElement {
  const wrap = el('div', 'stars');
  for (let i = 1; i <= 3; i++) {
    const s = el('span', i <= stars ? 'on' : 'off', '★');
    wrap.appendChild(s);
  }
  return wrap;
}
