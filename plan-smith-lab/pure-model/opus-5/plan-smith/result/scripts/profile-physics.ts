/**
 * A1의 "가장 싼 조기 검증" (§8).
 *
 *   가정 A1: matter-js 0.20.0이 동적 바디 약 80개와 제약 몇 개를
 *            60fps에서 프레임당 8ms 안에 처리한다.
 *   틀리면 : 스테이지당 바디 상한 60, enableSleeping, 파편은 전부 비물리.
 *
 * 이 스크립트는 브라우저 없이 그 수치를 낸다. 렌더가 빠져 있으므로
 * 결과는 "물리 예산"만이고, 프레임 예산 전체(16.67ms)의 판단에는
 * 렌더 계측(§9 Step 9)이 따로 필요하다 — 여기서 그것까지 주장하지 말 것.
 *
 *   npm run profile:physics
 */

import { Bodies, Composite, Engine } from 'matter-js';
import { STEP_MS } from '../src/physics/loop';
import { createPhysics } from '../src/physics/world';

const BODY_COUNT = 80;
const WARMUP_STEPS = 60;
const MEASURE_STEPS = 600;

function buildStack(): ReturnType<typeof createPhysics> {
  const physics = createPhysics(1);

  const ground = Bodies.rectangle(1000, 900, 3000, 120, { isStatic: true });
  Composite.add(physics.world, ground);

  // 10열 × 8층 = 80개. 실제 스테이지의 최악 케이스(9·10)와 같은 자릿수.
  const boxes = [];
  for (let col = 0; col < 10; col += 1) {
    for (let row = 0; row < 8; row += 1) {
      boxes.push(
        Bodies.rectangle(700 + col * 50, 300 - row * 45, 44, 40, {
          density: 0.0015,
          friction: 0.6,
        }),
      );
    }
  }
  Composite.add(physics.world, boxes);
  return physics;
}

function main(): void {
  const physics = buildStack();

  for (let i = 0; i < WARMUP_STEPS; i += 1) Engine.update(physics.engine, STEP_MS);

  const samples: number[] = [];
  for (let i = 0; i < MEASURE_STEPS; i += 1) {
    const t0 = performance.now();
    Engine.update(physics.engine, STEP_MS);
    samples.push(performance.now() - t0);
  }

  samples.sort((a, b) => a - b);
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
  const p50 = samples[Math.floor(samples.length * 0.5)];
  const p95 = samples[Math.floor(samples.length * 0.95)];
  const max = samples[samples.length - 1];

  console.log(`바디 ${BODY_COUNT}개 (+ 정적 지면 1), ${MEASURE_STEPS} 스텝 측정`);
  console.log(`  mean ${mean.toFixed(3)} ms`);
  console.log(`  p50  ${p50.toFixed(3)} ms`);
  console.log(`  p95  ${p95.toFixed(3)} ms`);
  console.log(`  max  ${max.toFixed(3)} ms`);
  console.log(`  판정 기준: p95 ≤ 8ms 이면 A1 유지, 넘으면 §8의 대체안으로 전환`);
  console.log(`  결과: ${p95 <= 8 ? 'A1 유지' : 'A1 위반 — 바디 상한 60 / enableSleeping / 비물리 파편'}`);
}

main();
