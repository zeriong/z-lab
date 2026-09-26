import { GROUND_Y, LOADING_SECONDS } from '../config/constants';
import { BIRDS } from '../config/catalog';
import type { BirdKind } from '../config/catalog';
import type { GameSession } from '../core/GameSession';
import type { Vec } from '../core/math';
import { clamp, len } from '../core/math';
import type { PhysBody } from '../core/physics/world';
import { launchPosition } from '../core/slingshot';
import { createBackgroundCache, drawBackground, drawGround, drawTerrain } from './draw/background';
import { drawBird } from './draw/bird';
import { drawBlock } from './draw/block';
import { drawPig } from './draw/pig';
import { drawBand, drawRestingBand, drawSlingshotBack, drawSlingshotFront, forkBack, forkFront } from './draw/slingshot';
import { drawTnt } from './draw/tnt';
import { drawOffscreenMarker, drawPreview, drawTrail } from './draw/trajectory';
import type { Effects } from './effects';
import type { Viewport } from './viewport';

/** Canvas 2D 렌더러. 세션 상태를 읽기만 한다 (§8). */

export interface RenderOptions {
  debug: boolean;
  fps: number;
  stepMs: number;
}

const QUEUE_GAP = 50;
const QUEUE_OFFSET = 80;

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly bg: HTMLCanvasElement;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly viewport: Viewport,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D 컨텍스트를 만들 수 없다');
    this.ctx = ctx;
    this.bg = createBackgroundCache();
  }

  /** 세션이 없을 때(메뉴) 배경만 그린다 */
  renderIdle(): void {
    const ctx = this.ctx;
    this.viewport.applyTransform(ctx);
    drawBackground(ctx, this.bg);
    drawGround(ctx);
  }

  render(session: GameSession, effects: Effects, opts: RenderOptions): void {
    if (session.isDestroyed) return;
    const ctx = this.ctx;
    this.viewport.applyTransform(ctx);

    // 1~2. 배경, 지면
    drawBackground(ctx, this.bg);
    drawGround(ctx);

    const anchor = session.anchor;
    const state = session.turnState;
    const loaded = session.loadedBird;

    // 새총 위 새의 위치 계산
    let pocket: Vec | null = null;
    let pullLen = 0;
    if (loaded) {
      if (state === 'AIMING' && session.aimPull) {
        pocket = launchPosition(anchor, session.aimPull, BIRDS[loaded].radius);
        pullLen = len(session.aimPull);
      } else if (state === 'READY' || state === 'AIMING') {
        pocket = anchor;
      }
    }

    // 3. 새총 뒤쪽 갈래와 뒤쪽 고무줄
    drawSlingshotBack(ctx, anchor);
    if (pocket) drawBand(ctx, forkBack(anchor), pocket, pullLen);

    // 4. 지형(0번은 지면이라 제외), 블록, TNT
    for (let i = 1; i < session.terrain.length; i++) drawTerrain(ctx, session.terrain[i]!.points);
    for (const b of session.blocks) {
      const pose = b.alive ? session.poseOf(b.body) : null;
      if (pose) drawBlock(ctx, b, pose);
    }
    for (const t of session.tnts) {
      const pose = t.alive ? session.poseOf(t.body) : null;
      if (pose) drawTnt(ctx, t, pose);
    }

    // 5. 돼지
    for (const p of session.pigs) {
      const pose = p.alive ? session.poseOf(p.body) : null;
      if (pose) drawPig(ctx, p, pose);
    }

    // 6. 날아가는 새, 대기 줄, 새총 위의 새
    const flying = session.bird;
    const flyingPose = flying ? session.poseOf(flying.body) : null;
    if (flying && flyingPose) drawBird(ctx, flying.kind, flyingPose.x, flyingPose.y, flyingPose.angle);

    const waiting: BirdKind[] = loaded ? session.birdQueue.slice(1) : session.birdQueue.slice(0);
    waiting.forEach((kind, i) => {
      const r = BIRDS[kind].radius;
      drawBird(ctx, kind, anchor.x - QUEUE_OFFSET - i * QUEUE_GAP, GROUND_Y - r, 0);
    });
    if (loaded) {
      if (state === 'LOADING') {
        const t = clamp((session.simTime - session.turnSince) / LOADING_SECONDS, 0, 1);
        const e = 1 - (1 - t) * (1 - t);
        const r = BIRDS[loaded].radius;
        const from = { x: anchor.x - QUEUE_OFFSET + QUEUE_GAP, y: GROUND_Y - r };
        const hop = Math.sin(Math.PI * e) * 60;
        drawBird(ctx, loaded, from.x + (anchor.x - from.x) * e, from.y + (anchor.y - from.y) * e - hop, 0);
      } else if (pocket) {
        drawBird(ctx, loaded, pocket.x, pocket.y, 0);
      }
    }

    // 7. 새총 앞쪽 갈래와 앞쪽 고무줄
    drawSlingshotFront(ctx, anchor);
    if (pocket) drawBand(ctx, forkFront(anchor), pocket, pullLen);
    else drawRestingBand(ctx, anchor);

    // 8. 궤적 예측 점, 직전 흔적
    drawTrail(ctx, session.trail);
    if (state === 'AIMING') drawPreview(ctx, session.predictedPath());

    // 9. 이펙트
    effects.draw(ctx);

    // 화면 위로 나간 새의 마커
    if (flying && flyingPose && flyingPose.y < -BIRDS[flying.kind].radius) {
      drawOffscreenMarker(ctx, flyingPose.x, flyingPose.y, BIRDS[flying.kind].color);
    }

    // 10. 디버그
    if (opts.debug) this.drawDebug(session, opts);
  }

  private drawDebug(session: GameSession, opts: RenderOptions): void {
    const ctx = this.ctx;
    const outline = (body: PhysBody | null, draw: () => void) => {
      const pose = session.poseOf(body);
      if (!pose) return;
      ctx.save();
      ctx.translate(pose.x, pose.y);
      ctx.rotate(pose.angle);
      ctx.strokeStyle = session.isAwake(body) ? 'rgba(255, 40, 40, 0.9)' : 'rgba(60, 120, 255, 0.9)';
      ctx.lineWidth = 1.5;
      draw();
      ctx.restore();
    };
    for (const b of session.blocks) {
      if (!b.alive) continue;
      outline(b.body, () => {
        ctx.beginPath();
        if (b.shape === 'circle') ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        else if (b.localVerts) {
          b.localVerts.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
          ctx.closePath();
        } else ctx.rect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.font = '10px monospace';
        ctx.fillText(String(Math.max(0, Math.round(b.hp))), -8, 3);
      });
    }
    for (const p of session.pigs) {
      if (!p.alive) continue;
      outline(p.body, () => {
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.moveTo(0, 0);
        ctx.lineTo(p.radius, 0);
        ctx.stroke();
      });
    }
    for (const t of session.tnts) {
      if (!t.alive) continue;
      outline(t.body, () => ctx.strokeRect(-t.w / 2, -t.h / 2, t.w, t.h));
    }
    const bird = session.bird;
    if (bird) outline(bird.body, () => {
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, 1000, 520, 70);
    ctx.fillStyle = '#0f0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`FPS ${opts.fps.toFixed(0)}  step ${opts.stepMs.toFixed(2)}ms  bodies ${session.bodyCount()}`, 20, 1026);
    ctx.fillText(`turn ${session.turnState}  t=${session.simTime.toFixed(2)}s  score ${session.score}`, 20, 1052);
    ctx.restore();
  }
}
