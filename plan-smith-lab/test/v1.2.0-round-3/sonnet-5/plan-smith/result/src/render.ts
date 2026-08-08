import Matter from "matter-js";
import type { DebrisParticle, Vec2 } from "./types";
import { bodyGameData } from "./physics";

const { Composite } = Matter;

const MATERIAL_COLOR: Record<string, string> = {
  ice: "#bde0fe",
  wood: "#a97142",
  stone: "#6b6b6b"
};

export interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  backgroundTint: string;
  world: Matter.World;
  debris: DebrisParticle[];
  trajectoryPoints: Vec2[];
  slingshotAnchor: Vec2;
  isDragging: boolean;
  dragBirdPos: Vec2 | null;
  now: number;
}

export function renderFrame(opts: RenderOptions): void {
  const { ctx, width, height, backgroundTint } = opts;

  // 배경 틴트(R22 — thin: 그라디언트)
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, backgroundTint);
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawSlingshotFrame(ctx, opts.slingshotAnchor);

  const bodies = Composite.allBodies(opts.world);
  for (const body of bodies) {
    const data = bodyGameData(body);
    if (!data) continue;

    if (data.kind === "terrain") {
      drawPolygon(ctx, body.vertices, "#5b3a29");
    } else if (data.kind === "block") {
      drawPolygon(ctx, body.vertices, MATERIAL_COLOR[data.material ?? "wood"]);
    } else if (data.kind === "pig") {
      drawCircle(ctx, body.position.x, body.position.y, (body as unknown as { circleRadius: number }).circleRadius, "#8fbf3f");
    } else if (data.kind === "bird") {
      drawCircle(ctx, body.position.x, body.position.y, (body as unknown as { circleRadius: number }).circleRadius, "#d62828");
    }
  }

  if (opts.isDragging && opts.dragBirdPos) {
    drawSlingshotBands(ctx, opts.slingshotAnchor, opts.dragBirdPos);
  }

  drawTrajectory(ctx, opts.trajectoryPoints);
  drawDebris(ctx, opts.debris, opts.now);
}

function drawPolygon(ctx: CanvasRenderingContext2D, vertices: Matter.Vector[], color: string): void {
  if (vertices.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.stroke();
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.stroke();
}

function drawSlingshotFrame(ctx: CanvasRenderingContext2D, anchor: Vec2): void {
  ctx.strokeStyle = "#5b3a29";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(anchor.x - 20, anchor.y + 60);
  ctx.lineTo(anchor.x, anchor.y - 20);
  ctx.moveTo(anchor.x + 20, anchor.y + 60);
  ctx.lineTo(anchor.x, anchor.y - 20);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawSlingshotBands(ctx: CanvasRenderingContext2D, anchor: Vec2, birdPos: Vec2): void {
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(anchor.x - 18, anchor.y - 10);
  ctx.lineTo(birdPos.x, birdPos.y);
  ctx.lineTo(anchor.x + 18, anchor.y - 10);
  ctx.stroke();
  ctx.lineWidth = 1;
}

// R7 — 드래그 중 매 프레임 재계산되는 점선 아크 프리뷰.
function drawTrajectory(ctx: CanvasRenderingContext2D, points: Vec2[]): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

// R12 — 파괴 시각 피드백(thin: 동시 최대 20개, 페이드 아웃).
function drawDebris(ctx: CanvasRenderingContext2D, debris: DebrisParticle[], now: number): void {
  for (const particle of debris) {
    const age = now - particle.createdAt;
    const lifeRatio = Math.max(0, 1 - age / particle.ttlMs);
    if (lifeRatio <= 0) continue;
    ctx.globalAlpha = lifeRatio;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 5 * lifeRatio + 2, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
