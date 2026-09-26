// 렌더러: 모든 씬에서 매 프레임 호출. 게임 상태는 읽기만 한다.
import { ANCHOR, SLING_FORK_BACK, SLING_FORK_FRONT, WORLD_H, WORLD_W } from '../config';
import type { Game } from '../core/game';
import type { StageSession } from '../physics/session';
import { S } from '../ui/strings';
import { drawBand, drawBird, drawDots, drawHintFinger, drawSlingBack, drawSlingFront } from './draw/actors';
import { drawEffects } from './draw/fx';
import { drawBackground, drawBlock, drawGround, drawPig, drawStatic } from './draw/world';
import type { Viewport } from './viewport';

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly viewport: Viewport,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D를 사용할 수 없습니다');
    this.ctx = ctx;
  }

  render(game: Game): void {
    const { ctx, canvas, viewport } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (viewport.scale <= 0) return;

    const session = game.session;
    const shake = session ? session.effects.shakeOffset() : { x: 0, y: 0 };
    viewport.applyWorldTransform(ctx, shake);

    // 레터박스 밖으로 그리지 않는다
    ctx.save();
    ctx.beginPath();
    ctx.rect(-shake.x, -shake.y, WORLD_W, WORLD_H);
    ctx.clip();

    drawBackground(ctx);
    drawGround(ctx);

    if (session && !session.disposed) {
      this.drawSession(session);
    } else {
      // 메뉴 배경: 새총과 새
      drawSlingBack(ctx);
      drawBand(ctx, SLING_FORK_BACK, ANCHOR);
      drawBird(ctx, 'red', ANCHOR.x, ANCHOR.y);
      drawBand(ctx, SLING_FORK_FRONT, ANCHOR);
      drawSlingFront(ctx);
    }
    ctx.restore();
  }

  private drawSession(s: StageSession): void {
    const ctx = this.ctx;

    // 직전 궤적 (R6 후반)
    if (s.trail.length > 1) drawDots(ctx, s.trail, 'rgba(255,255,255,0.45)', 4);

    // 지형·블록·돼지·비행 중인 새
    for (const rec of s.registry.values()) {
      const e = rec.entity;
      switch (e.kind) {
        case 'static':
          drawStatic(ctx, rec.body);
          break;
        case 'block':
          drawBlock(ctx, rec.body, e);
          break;
        case 'pig':
          drawPig(ctx, rec.body, e);
          break;
        case 'bird':
          drawBird(ctx, e.birdType, rec.body.position.x, rec.body.position.y, rec.body.angle, rec.body.circleRadius);
          break;
      }
    }

    // 새총
    drawSlingBack(ctx);
    const sl = s.slingshot;
    if (sl.state !== 'EMPTY' && sl.birdType) {
      const bp = sl.birdPosition();
      drawBand(ctx, SLING_FORK_BACK, bp);
      drawBird(ctx, sl.birdType, bp.x, bp.y);
      drawBand(ctx, SLING_FORK_FRONT, bp);
    } else {
      drawBand(ctx, SLING_FORK_BACK, SLING_FORK_FRONT);
    }
    drawSlingFront(ctx);

    // 궤적 예측 점선 (드래그 중, 15점)
    if (sl.state === 'DRAGGING' && sl.preview.length > 0) {
      drawDots(ctx, sl.preview, 'rgba(255,255,255,0.95)', 5);
    }

    drawEffects(ctx, s.effects);

    if (s.hintVisible && s.phase === 'AIMING' && sl.state === 'LOADED') {
      drawHintFinger(ctx, s.stepCount, S.hint);
    }
  }
}
