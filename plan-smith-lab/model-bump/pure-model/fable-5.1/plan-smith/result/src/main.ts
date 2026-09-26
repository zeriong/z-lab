// 엔트리. DOM 루트를 모아 Game을 부팅한다. 스타일은 index.html의 <link>로 로드.
import { Game } from './game';

function must<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} not found`);
  return node as T;
}

const game = new Game({
  app: must<HTMLElement>('app'),
  stage: must<HTMLElement>('stage'),
  canvas: must<HTMLCanvasElement>('game-canvas'),
  rotate: must<HTMLElement>('rotate-overlay'),
});

game.boot();
