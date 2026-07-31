import './style.css';
import { sfx } from './audio';
import { Game } from './game';

function boot(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('#game-canvas 를 찾을 수 없습니다.');
    return;
  }

  // 브라우저 autoplay 정책: 최초 사용자 입력에서 오디오 컨텍스트를 깨운다.
  const unlock = () => {
    sfx.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // 캔버스 위 드래그 시 브라우저 기본 동작(선택/스크롤) 차단
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  new Game(canvas);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
