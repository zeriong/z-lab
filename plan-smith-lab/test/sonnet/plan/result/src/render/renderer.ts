// Render 레이어: Canvas 2D 드로잉. 물리 시뮬레이션과 완전히 분리되어
// 매 requestAnimationFrame 마다 현재 바디 위치를 읽어서 그리기만 한다.
import type Matter from "matter-js";
import type { Game } from "../game/game";
import { VIEW_W, VIEW_H } from "./camera";
import { computeTrajectory } from "../game/trajectory";
import { ParticleSystem } from "./particles";
import { BIRDS } from "../data/birds";
import { MATERIALS } from "../data/materials";
import type { BirdPlugin, BlockPlugin, PigPlugin } from "../core/physics";
import { bus, Events } from "../eventBus";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private particles = new ParticleSystem();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;

    bus.on<{ x: number; y: number; color: string; big: boolean }>(Events.BlockDestroyed, (p) => {
      this.particles.spawn(p.x, p.y, p.color, p.big ? 26 : 10, p.big);
    });
    bus.on<{ x: number; y: number }>(Events.PigRemoved, (p) => {
      this.particles.spawn(p.x, p.y, "#6fbf4f", 14, false);
    });
  }

  update(dtMs: number): void {
    this.particles.update(dtMs);
  }

  clearParticles(): void {
    this.particles.clear();
  }

  draw(game: Game): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    if (!game.stage || !game.physics || !game.camera) {
      this.drawIdleBackground();
      return;
    }

    const camera = game.camera;
    const stage = game.stage;

    this.drawSky();
    this.drawGround(stage.groundY, stage.worldWidth, camera);
    this.drawSlingshotPosts(stage.slingshotAnchor, camera);

    // 조준 중이면 궤적 예측선
    const launchVel = game.slingshot?.getLaunchVelocity();
    if (launchVel && game.slingshot?.currentBird) {
      const pts = computeTrajectory(
        { x: stage.slingshotAnchor.x, y: stage.slingshotAnchor.y },
        launchVel
      );
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (const pt of pts) {
        ctx.beginPath();
        ctx.arc(camera.toScreenX(pt.x), pt.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 새총 밴드 (앵커 포크 -> 현재 새 위치)
    const bandTarget = game.slingshot?.currentBird?.position ?? stage.slingshotAnchor;
    this.drawSlingshotBands(stage.slingshotAnchor, bandTarget, camera);

    // 물리 바디들
    for (const body of game.physics.allBodies()) {
      const plugin = body.plugin as BlockPlugin | PigPlugin | BirdPlugin | { kind: "ground" } | undefined;
      if (!plugin || plugin.kind === "ground") continue;
      if (plugin.kind === "block") this.drawBlock(body, plugin, camera);
      else if (plugin.kind === "pig") this.drawPig(body, camera);
      else if (plugin.kind === "bird") this.drawBird(body, plugin, camera);
    }

    this.particles.draw(ctx, camera);
  }

  private drawIdleBackground(): void {
    this.drawSky();
  }

  private drawSky(): void {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, "#8ecae6");
    g.addColorStop(1, "#d6f0f5");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  private drawGround(groundY: number, worldWidth: number, camera: { toScreenX: (x: number) => number }): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#7ab648";
    ctx.fillRect(0, groundY, VIEW_W, VIEW_H - groundY);
    ctx.strokeStyle = "#5c8f34";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(VIEW_W, groundY);
    ctx.stroke();
  }

  private drawSlingshotPosts(anchor: { x: number; y: number }, camera: { toScreenX: (x: number) => number }): void {
    const ctx = this.ctx;
    const x = camera.toScreenX(anchor.x);
    ctx.strokeStyle = "#6b4423";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 22, anchor.y + 70);
    ctx.lineTo(x - 14, anchor.y - 34);
    ctx.moveTo(x + 22, anchor.y + 70);
    ctx.lineTo(x + 14, anchor.y - 34);
    ctx.stroke();
  }

  private drawSlingshotBands(
    anchor: { x: number; y: number },
    target: { x: number; y: number },
    camera: { toScreenX: (x: number) => number }
  ): void {
    const ctx = this.ctx;
    const ax = camera.toScreenX(anchor.x);
    const tx = camera.toScreenX(target.x);
    ctx.strokeStyle = "#4a2f16";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ax - 14, anchor.y - 30);
    ctx.lineTo(tx, target.y);
    ctx.moveTo(ax + 14, anchor.y - 30);
    ctx.lineTo(tx, target.y);
    ctx.stroke();
  }

  private drawBlock(body: Matter.Body, plugin: BlockPlugin, camera: { toScreenX: (x: number) => number }): void {
    const ctx = this.ctx;
    const spec = MATERIALS[plugin.material];
    const damageRatio = 1 - plugin.hp / plugin.maxHp;

    ctx.save();
    ctx.translate(camera.toScreenX(body.position.x), body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = spec.color;
    ctx.strokeStyle = spec.strokeColor;
    ctx.lineWidth = 2;

    if (body.circleRadius) {
      ctx.beginPath();
      ctx.arc(0, 0, body.circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // vertices 로 폭/높이를 역산 (AABB 기준, 회전은 이미 ctx.rotate 로 처리됨)
      const local = body.vertices.map((v) => ({
        x: v.x - body.position.x,
        y: v.y - body.position.y,
      }));
      // 회전 반영 전(로컬) 좌표를 얻기 위해 -angle 로 되돌림
      const cos = Math.cos(-body.angle);
      const sin = Math.sin(-body.angle);
      const unrotated = local.map((v) => ({ x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos }));
      ctx.beginPath();
      unrotated.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (damageRatio > 0.35) {
      ctx.globalAlpha = Math.min(0.6, damageRatio);
      ctx.strokeStyle = "#2a1a0a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, 6);
      ctx.moveTo(6, -6);
      ctx.lineTo(-6, 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawPig(body: Matter.Body, camera: { toScreenX: (x: number) => number }): void {
    const ctx = this.ctx;
    const r = body.circleRadius ?? 20;
    const x = camera.toScreenX(body.position.x);
    const y = body.position.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);
    ctx.fillStyle = "#7bc142";
    ctx.strokeStyle = "#4c8a24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 눈
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // 코
    ctx.fillStyle = "#5c9a34";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.25, r * 0.32, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBird(body: Matter.Body, plugin: BirdPlugin, camera: { toScreenX: (x: number) => number }): void {
    const ctx = this.ctx;
    const spec = BIRDS[plugin.birdType];
    const r = body.circleRadius ?? spec.radius;
    const x = camera.toScreenX(body.position.x);
    const y = body.position.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);
    ctx.fillStyle = spec.color;
    ctx.strokeStyle = spec.strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.2, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.2, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    if (spec.hasAbility && !plugin.abilityUsed && plugin.launched) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
