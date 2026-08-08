// B2 — 메인 메뉴
//
// 시작 경로가 한 번의 클릭으로 열린다.

import { VIRTUAL_H, VIRTUAL_W } from '../physics/units';
import { drawButton, pickButton, text } from '../ui/button';
import type { UIButton } from '../ui/button';
import type { SaveData } from '../core/save';

export type MenuAction = 'start' | 'reset';

export function menuButtons(): UIButton[] {
  const bw = 460;
  const bx = (VIRTUAL_W - bw) / 2;
  return [
    { id: 'start', x: bx, y: 600, w: bw, h: 104, label: '게임 시작', tone: 'primary' },
    { id: 'reset', x: bx, y: 728, w: bw, h: 84, label: '진행 초기화', tone: 'ghost' },
  ];
}

export function pickMenuAction(x: number, y: number): MenuAction | null {
  const b = pickButton(menuButtons(), x, y);
  return b ? (b.id as MenuAction) : null;
}

export function drawMenu(
  ctx: CanvasRenderingContext2D,
  save: SaveData,
  hoverId: string | null,
): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIRTUAL_H);
  g.addColorStop(0, 'rgb(96, 168, 226)');
  g.addColorStop(0.7, 'rgb(176, 218, 240)');
  g.addColorStop(1, 'rgb(150, 196, 132)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

  ctx.fillStyle = 'rgb(126, 92, 56)';
  ctx.fillRect(0, 960, VIRTUAL_W, VIRTUAL_H - 960);
  ctx.fillStyle = 'rgb(104, 152, 76)';
  ctx.fillRect(0, 960, VIRTUAL_W, 28);

  text(
    ctx,
    'ANGRY BIRDS',
    VIRTUAL_W / 2,
    300,
    'bold 128px "Trebuchet MS", sans-serif',
    'rgb(214, 62, 54)',
    'center',
  );
  text(
    ctx,
    '새총으로 구조물을 무너뜨리고 돼지를 제거하세요',
    VIRTUAL_W / 2,
    400,
    '34px "Apple SD Gothic Neo", sans-serif',
    'rgba(28, 40, 56, 0.8)',
    'center',
  );

  const cleared = save.cleared.length;
  const stars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  text(
    ctx,
    `클리어 ${cleared} / 10    획득 별 ${stars} / 30`,
    VIRTUAL_W / 2,
    486,
    '30px "Apple SD Gothic Neo", sans-serif',
    'rgba(28, 40, 56, 0.65)',
    'center',
  );

  for (const b of menuButtons()) drawButton(ctx, b, b.id === hoverId);
}
