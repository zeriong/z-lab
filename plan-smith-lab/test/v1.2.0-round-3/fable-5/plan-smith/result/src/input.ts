// 입력 (S5) — Pointer Events로 마우스·터치 통합 (L5, L6).
// 캔버스 CSS 크기 ↔ 내부 해상도(960×540) 역변환으로 좌표를 월드로 옮긴다 (L27).

import { WORLD_W, WORLD_H } from './constants';
import { unlockAudio } from './audio';
import type { Session } from './world';

export function attachInput(canvas: HTMLCanvasElement, active: () => Session | null): void {
  let dragging = false;

  const toWorld = (e: PointerEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * WORLD_W) / rect.width,
      y: ((e.clientY - rect.top) * WORLD_H) / rect.height,
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    unlockAudio(); // 첫 사용자 입력에서 AudioContext 생성/재개 (L22)
    const session = active();
    if (!session) return;
    const p = toWorld(e);
    if (session.tryStartAim(p.x, p.y)) {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const session = active();
    if (!session) {
      dragging = false;
      return;
    }
    const p = toWorld(e);
    session.dragTo(p.x, p.y);
    e.preventDefault();
  });

  const onUp = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    const session = active();
    session?.release(performance.now());
    e.preventDefault();
  };
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
}
