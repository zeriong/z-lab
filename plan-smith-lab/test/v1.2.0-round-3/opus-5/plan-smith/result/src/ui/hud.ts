// 인게임 HUD — 스테이지명·점수·남은 새 + 우측 조작 버튼(일시정지·음소거).

import { VIRTUAL_W } from '../physics/units';
import { text } from './button';
import { drawMuteButton, drawPauseButton } from './pauseButton';
import type { World } from '../game/world';

export function drawHud(
  ctx: CanvasRenderingContext2D,
  world: World,
  muted: boolean,
  hover: 'pause' | 'mute' | null,
): void {
  // 좌상단: 스테이지 + 점수
  ctx.save();
  ctx.fillStyle = 'rgba(14, 20, 32, 0.55)';
  ctx.fillRect(36, 36, 470, 128);
  ctx.restore();

  text(
    ctx,
    `${world.def.id}. ${world.def.name}`,
    58,
    76,
    'bold 30px "Apple SD Gothic Neo", sans-serif',
    'rgb(245, 240, 230)',
  );
  text(
    ctx,
    `점수 ${world.score.total.toLocaleString()}`,
    58,
    122,
    '28px "Apple SD Gothic Neo", sans-serif',
    'rgb(255, 208, 66)',
  );
  text(
    ctx,
    `돼지 ${world.pigsAlive}`,
    330,
    122,
    '28px "Apple SD Gothic Neo", sans-serif',
    'rgb(150, 220, 130)',
  );

  // 남은 새 아이콘
  const total = world.def.birds;
  const remaining = world.birdsRemaining;
  for (let i = 0; i < total; i++) {
    const cx = 70 + i * 52;
    const cy = 208;
    ctx.save();
    ctx.globalAlpha = i < remaining ? 1 : 0.22;
    ctx.beginPath();
    ctx.arc(cx, cy, 19, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(214, 62, 54)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 10, 8, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // 우측 조작
  drawPauseButton(ctx, hover === 'pause');
  drawMuteButton(ctx, muted, hover === 'mute');

  text(
    ctx,
    '새를 끌어 당겼다 놓으면 발사',
    VIRTUAL_W / 2,
    1030,
    '24px "Apple SD Gothic Neo", sans-serif',
    'rgba(240, 244, 250, 0.55)',
    'center',
  );
}
