import { App } from './app';

function fatal(message: string): void {
  const el = document.getElementById('fatal');
  if (!el) return;
  el.style.display = 'flex';
  el.textContent = `게임을 시작할 수 없습니다.\n${message}`;
}

try {
  const canvas = document.getElementById('game-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('캔버스 엘리먼트를 찾지 못했습니다.');
  }
  const app = new App(canvas);
  app.start();
} catch (e) {
  fatal(e instanceof Error ? e.message : String(e));
}
