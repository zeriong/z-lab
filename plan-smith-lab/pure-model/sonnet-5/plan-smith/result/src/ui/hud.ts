/**
 * 표면 17 — 잔여 발사체 수 HUD.
 * quality floor: 잔여 발사체 수가 항상 보이고, 그 값이 0이 되는 프레임과 실패 판정이
 * 발생하는 프레임 사이에 지연이 없어야 한다(App.ts에서 update()와 evaluateOutcome()을 같은 호출 지점에서 실행).
 */
export class Hud {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.setAttribute('data-testid', 'hud-remaining');
    container.appendChild(this.el);
  }

  update(remaining: number): void {
    this.el.textContent = `남은 발사체: ${remaining}`;
  }

  destroy(): void {
    this.el.remove();
  }
}
