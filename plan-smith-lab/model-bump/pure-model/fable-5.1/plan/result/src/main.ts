/** 부트스트랩: 캔버스·컨테이너·UI 루트를 찾아 Game 을 만들고 루프를 시작한다. */
import { Game } from './core/Game';

function required<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} not found`);
  return node as T;
}

const canvas = required<HTMLCanvasElement>('world');
const container = required<HTMLElement>('game');
const uiRoot = required<HTMLElement>('ui');

const game = new Game(canvas, container, uiRoot);
game.start();

// 콘솔 디버깅용 (누수 검사: __game.bodyCount())
declare global {
  interface Window {
    __game?: Game;
  }
}
window.__game = game;
