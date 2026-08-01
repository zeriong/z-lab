/** DOM 헬퍼 — 오버레이 UI는 진짜 <button> 이므로 포커스·키보드를 다시 구현하지 않는다(§3). */

export function q<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`[dom] 필수 요소 없음: ${selector}`);
  return el;
}

export function show(el: HTMLElement): void {
  el.classList.remove('hidden');
  el.removeAttribute('aria-hidden');
}

export function hide(el: HTMLElement): void {
  el.classList.add('hidden');
  el.setAttribute('aria-hidden', 'true');
}

export function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}

export function onClick(el: HTMLElement, fn: () => void): void {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    fn();
  });
}
