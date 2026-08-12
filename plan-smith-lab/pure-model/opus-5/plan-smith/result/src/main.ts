/**
 * 부팅 진입점.
 *
 * 여기가 하는 일은 세 가지뿐이다: DOM 두 개를 찾고, App을 만들고, start()를 부른다.
 * 로직이 여기 늘어나기 시작하면 app.ts의 상태 머신이 유일한 전이 주체라는
 * 전제가 조용히 깨진다.
 */

import './style.css';
import { App } from './app';

function boot(): void {
  const canvas = document.getElementById('game-canvas');
  const uiRoot = document.getElementById('ui-root');

  if (!(canvas instanceof HTMLCanvasElement) || !(uiRoot instanceof HTMLElement)) {
    throw new Error('index.html에 #game-canvas / #ui-root가 없습니다');
  }

  const app = new App(canvas, uiRoot);
  app.start();

  // Vite HMR: 모듈이 교체될 때 이전 App의 RAF·리스너·물리 월드를 정리한다.
  // 이걸 빼면 개발 중에 씬이 겹쳐 돌아 "가끔 느려지는" 재현 불가 버그가 된다.
  if (import.meta.hot) {
    import.meta.hot.dispose(() => app.destroy());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
