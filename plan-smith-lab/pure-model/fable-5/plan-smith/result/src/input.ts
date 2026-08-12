// 슬링샷 드래그 입력 (M6) — Pointer Events로 마우스+터치 통합 (A2).
// 리스너는 부트스트랩에서 1회 바인딩된다. PLAYING && AIMING 가드는 game 쪽에 있다 (§9 콜드스타트).

import type { Game } from './game';
import { WORLD } from './config';
import * as audio from './audio';

export function bindInput(canvas: HTMLCanvasElement, game: Game): void {
  canvas.style.touchAction = 'none';

  const toLogical = (e: PointerEvent): { x: number; y: number } => {
    // 레터박스 스케일(M24)과 무관하게 논리 좌표로 환산
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (WORLD.width / r.width),
      y: (e.clientY - r.top) * (WORLD.height / r.height),
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    audio.unlock(); // 첫 제스처에서 AudioContext 활성화
    const p = toLogical(e);
    game.pointerDown(p.x, p.y);
    e.preventDefault();
  });

  window.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    game.pointerMove(p.x, p.y);
  });

  window.addEventListener('pointerup', () => {
    game.pointerUp();
  });
}
