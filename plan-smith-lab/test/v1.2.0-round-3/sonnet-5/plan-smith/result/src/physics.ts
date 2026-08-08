import Matter from "matter-js";
import type { StageConfig } from "./types";
import { breakThresholdFor } from "./scoring";

const { Engine, World, Bodies, Body } = Matter;

export const BIRD_RADIUS = 18;
export const GRAVITY_Y = 1;

// 바디에 매달아 두는 게임 도메인 메타데이터. Matter.Body에는 임의 필드를 붙일 수 있으므로
// plugin 네임스페이스를 사용해 material/killThreshold/id를 함께 실어 나른다.
export interface BodyGameData {
  kind: "terrain" | "block" | "pig" | "bird";
  id: string;
  material?: "ice" | "wood" | "stone";
  breakThreshold?: number;
  killThreshold?: number;
}

export function bodyGameData(body: Matter.Body): BodyGameData | undefined {
  return (body.plugin as { game?: BodyGameData } | undefined)?.game;
}

function attachGameData(body: Matter.Body, data: BodyGameData): Matter.Body {
  body.plugin = { ...(body.plugin ?? {}), game: data };
  return body;
}

export function createEngine(): Matter.Engine {
  const engine = Engine.create();
  engine.gravity.y = GRAVITY_Y;
  return engine;
}

export function buildWorld(engine: Matter.Engine, stage: StageConfig): void {
  const world = engine.world;

  for (const segment of stage.terrain) {
    const terrainBody = Bodies.rectangle(segment.x, segment.y, segment.width, segment.height, {
      isStatic: true,
      friction: 0.9
    });
    attachGameData(terrainBody, { kind: "terrain", id: `terrain-${segment.x}-${segment.y}` });
    World.add(world, terrainBody);
  }

  for (const blockConfig of stage.blocks) {
    const blockBody = Bodies.rectangle(blockConfig.x, blockConfig.y, blockConfig.width, blockConfig.height, {
      angle: blockConfig.angle ?? 0,
      friction: 0.6,
      restitution: 0.05,
      density: 0.0015
    });
    attachGameData(blockBody, {
      kind: "block",
      id: blockConfig.id,
      material: blockConfig.material,
      breakThreshold: breakThresholdFor(blockConfig.material)
    });
    World.add(world, blockBody);
  }

  for (const pigConfig of stage.pigs) {
    const pigBody = Bodies.circle(pigConfig.x, pigConfig.y, pigConfig.radius, {
      friction: 0.5,
      restitution: 0.1,
      density: 0.001
    });
    attachGameData(pigBody, { kind: "pig", id: pigConfig.id, killThreshold: pigConfig.killThreshold });
    World.add(world, pigBody);
  }
}

export function createBird(x: number, y: number): Matter.Body {
  const bird = Bodies.circle(x, y, BIRD_RADIUS, {
    friction: 0.4,
    restitution: 0.35,
    density: 0.004
  });
  attachGameData(bird, { kind: "bird", id: `bird-${x}-${y}-${Date.now()}` });
  return bird;
}

export function relativeSpeed(bodyA: Matter.Body, bodyB: Matter.Body): number {
  const dx = bodyA.velocity.x - bodyB.velocity.x;
  const dy = bodyA.velocity.y - bodyB.velocity.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 충격량 근사치 — Explicit assumptions의 로드베어링 가정: Matter.js pair.collision.depth ×
 * 충돌 시점 상대속도가 파괴 판정에 쓸 수 있을 만큼 안정적인 신호라고 가정한다.
 * 폴백(신호가 불안정할 경우): 운동량 변화량 Δp = m·Δv 직접 계산 — 이 함수의 호출부만
 * 교체하면 되도록 반환값의 의미(스칼라 "충격 세기")를 유지한다.
 */
export function impulseMagnitude(pair: Matter.IPair): number {
  const depth = (pair.collision as unknown as { depth?: number })?.depth ?? 0;
  const speed = relativeSpeed(pair.bodyA, pair.bodyB);
  return depth * speed;
}

// epsilon — declared arbitrary, lifetime cap: Step 8 플레이테스트에서 실측 교체.
// R14 실패 판정("투사체가 정지 상태일 때만")이 이 값에 의존한다.
export function isBodyAtRest(body: Matter.Body, epsilon = 0.05): boolean {
  return Math.abs(body.velocity.x) < epsilon && Math.abs(body.velocity.y) < epsilon;
}

export function teardownWorld(engine: Matter.Engine): void {
  World.clear(engine.world, false);
  Engine.clear(engine);
}

export { Body };
