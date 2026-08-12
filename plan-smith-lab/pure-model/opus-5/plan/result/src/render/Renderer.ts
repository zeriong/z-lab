import type { Camera } from '../core/Camera';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../core/constants';
import type { Level } from '../game/Level';
import { BIRDS } from '../physics/materials';
import { drawDebug, type DebugInfo } from './DebugRender';
import type { Particles } from './Particles';
import {
  drawBackground,
  drawBird,
  drawBirdIcon,
  drawBlock,
  drawGround,
  drawPig,
  drawSlingshot,
  drawTrajectory,
} from './shapes';

export interface SceneInput {
  level: Level | null;
  camera: Camera;
  particles: Particles;
  alpha: number;
  debug: DebugInfo | null;
}

/**
 * Canvas 2D renderer (plan §1.2). Layer order:
 *   background -> ground -> blocks -> pigs -> bird/sling -> particles -> HUD bits
 *
 * The backbuffer is devicePixelRatio-scaled while all drawing happens in the
 * fixed 1280x720 logical space; the CSS box is letterboxed so the aspect ratio
 * never changes and physics tuning never depends on the window.
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private displayRect = { left: 0, top: 0, width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly uiRoot: HTMLElement,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  /** Letterbox fit + DPR backbuffer + UI layer alignment. */
  resize(): void {
    const availW = window.innerWidth;
    const availH = window.innerHeight;
    const scale = Math.min(availW / LOGICAL_WIDTH, availH / LOGICAL_HEIGHT);

    const width = Math.floor(LOGICAL_WIDTH * scale);
    const height = Math.floor(LOGICAL_HEIGHT * scale);
    const left = Math.floor((availW - width) / 2);
    const top = Math.floor((availH - height) / 2);
    this.displayRect = { left, top, width, height };

    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.floor(LOGICAL_WIDTH * this.dpr);
    this.canvas.height = Math.floor(LOGICAL_HEIGHT * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.style.left = `${left}px`;
    this.canvas.style.top = `${top}px`;

    // The DOM UI is authored in logical pixels and scaled to the same rect,
    // so a button placed at (1200, 20) lands on the same spot as canvas art.
    this.uiRoot.style.left = `${left}px`;
    this.uiRoot.style.top = `${top}px`;
    this.uiRoot.style.transform = `scale(${scale})`;
  }

  /** Single conversion path: client px -> logical px (plan §1.2). */
  clientToLogical(clientX: number, clientY: number): { x: number; y: number } {
    const { left, top, width, height } = this.displayRect;
    return {
      x: ((clientX - left) / width) * LOGICAL_WIDTH,
      y: ((clientY - top) / height) * LOGICAL_HEIGHT,
    };
  }

  render(scene: SceneInput): void {
    const { ctx } = this;
    const { camera, level, particles, alpha } = scene;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    drawBackground(ctx, camera.x, camera.zoom);

    if (!level) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      return;
    }

    const view = camera.viewRect();

    ctx.save();
    camera.apply(ctx);

    drawGround(ctx, level.ground);

    for (const block of level.blocks) {
      const x = block.renderX(alpha);
      const y = block.renderY(alpha);
      if (x < view.left - 120 || x > view.right + 120) continue;
      drawBlock(ctx, block, x, y, block.renderAngle(alpha));
    }

    for (const pig of level.pigs) {
      const x = pig.renderX(alpha);
      const y = pig.renderY(alpha);
      if (x < view.left - 80 || x > view.right + 80) continue;
      drawPig(ctx, pig, x, y, pig.renderAngle(alpha));
    }

    const aim = level.getAimView();
    const sling = level.slingshot;
    const bird = level.activeBird;

    if (aim) {
      drawSlingshot(ctx, aim.anchorX, aim.anchorY, aim.birdX, aim.birdY, true);
      drawBird(ctx, aim.kind, aim.birdX, aim.birdY, -aim.pullRatio * 0.35);
      if (aim.trajectory.length) drawTrajectory(ctx, aim.trajectory);
    } else {
      drawSlingshot(ctx, sling.anchorX, sling.anchorY, sling.anchorX, sling.anchorY, false);
      if (bird && bird.launched) {
        drawBird(
          ctx,
          bird.kind,
          bird.renderX(alpha),
          bird.renderY(alpha),
          bird.renderAngle(alpha),
        );
      }
    }

    particles.draw(ctx);

    ctx.restore();

    this.drawBirdQueue(level);

    if (scene.debug) drawDebug(ctx, camera, scene.debug);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Remaining birds, bottom-left, in screen space (plan §7.3). */
  private drawBirdQueue(level: Level): void {
    const { ctx } = this;
    const queue = level.queue;
    if (queue.length === 0) return;

    ctx.save();
    ctx.translate(36, LOGICAL_HEIGHT - 46);
    for (let i = 0; i < queue.length; i += 1) {
      const kind = queue[i];
      drawBirdIcon(ctx, kind, i * 40, 0, Math.min(16, BIRDS[kind].radius), i > 0);
    }
    ctx.restore();
  }
}
