// 스테이지 검증 하네스 (Node에서 헤드리스 실행: `npm run verify:stages`)
// 1) 안정성: 로드 후 5초 방치 시 자멸(블록 파괴/돼지 사망)이 없어야 한다.
// 2) 재현성: 같은 스테이지를 두 번 로드하면 완전히 동일한 초기 배치여야 한다.
// 3) 클리어 가능성: 각 새마다 각도×파워 후보를 탐욕 탐색해, 주어진 새 수 안에서
//    돼지 전멸이 실제 물리로 가능함을 증명한다. (DoD #1)
import Matter from 'matter-js';
import { MAX_PULL } from '../src/core/constants.ts';

// Node 전용 스크립트 — @types/node 없이 최소 선언만 사용
declare const process: { exit(code: number): never };
import { STAGES, type StageDef } from '../src/data/stages.ts';
import { launchVelocity } from '../src/game/Slingshot.ts';
import { Stage } from '../src/game/Stage.ts';

const { Composite } = Matter;

interface Shot {
  angleDeg: number;
  power: number; // 0..1 (최대 당김 비율)
}

interface SimResult {
  cleared: boolean;
  failed: boolean;
  pigsAlive: number;
  score: number;
  canAim: boolean;
}

const ANGLES = Array.from({ length: 23 }, (_, i) => i * 4 - 2); // -2°..86°
const POWERS = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const MAX_STEPS_PER_SHOT = 20 * 60;
const BEAM_WIDTH = 6;

function fireShot(stage: Stage, shot: Shot): void {
  const bird = stage.currentBird;
  if (!bird) throw new Error('no bird to fire');
  const rad = (shot.angleDeg * Math.PI) / 180;
  const pull = {
    x: Math.cos(rad) * MAX_PULL * shot.power,
    y: -Math.sin(rad) * MAX_PULL * shot.power,
  };
  stage.fire(launchVelocity(pull, bird.type));
}

// 고정 타임스텝 물리는 결정적이므로, 같은 샷 시퀀스를 처음부터 재생하면 항상 같은 결과가 나온다.
function simulate(def: StageDef, shots: Shot[]): SimResult {
  const stage = new Stage();
  let cleared = false;
  let failed = false;
  stage.onEvent((e) => {
    if (e.type === 'cleared') cleared = true;
    if (e.type === 'failed') failed = true;
  });
  stage.load(def);

  for (const shot of shots) {
    if (cleared || failed) break;
    if (stage.phase !== 'aim') throw new Error(`expected aim phase, got ${stage.phase}`);
    fireShot(stage, shot);
    let steps = 0;
    while (stage.phase !== 'aim' && stage.phase !== 'done' && steps < MAX_STEPS_PER_SHOT) {
      stage.step();
      steps++;
    }
  }
  return {
    cleared,
    failed,
    pigsAlive: stage.pigsAlive,
    score: stage.score,
    canAim: stage.phase === 'aim',
  };
}

function verifyStability(def: StageDef): boolean {
  const stage = new Stage();
  let broke = false;
  stage.onEvent((e) => {
    if (e.type === 'blockDestroyed' || e.type === 'pigKilled') broke = true;
  });
  stage.load(def);
  for (let i = 0; i < 300; i++) stage.step(); // 5초 방치
  const ok = !broke && stage.pigsAlive === def.pigs.length && stage.phase === 'aim';
  if (!ok) {
    console.error(
      `  [불안정] pigsAlive=${stage.pigsAlive}/${def.pigs.length} broke=${broke} phase=${stage.phase}`,
    );
  }
  return ok;
}

function snapshotPositions(stage: Stage): string {
  return Composite.allBodies(stage.engine.world)
    .map((b) => `${b.label}:${b.position.x.toFixed(4)},${b.position.y.toFixed(4)}`)
    .sort()
    .join('|');
}

function verifyDeterminism(def: StageDef): boolean {
  const snap = (): string => {
    const stage = new Stage();
    stage.load(def);
    for (let i = 0; i < 120; i++) stage.step();
    return snapshotPositions(stage);
  };
  return snap() === snap();
}

// 빔 서치: 각 새마다 (각도×파워) 전 후보를 평가하고 상위 BEAM_WIDTH개의 샷 시퀀스만 유지.
// 고정 스텝 물리가 결정적이므로 시퀀스 재생 = 재현이다.
function findClearingShots(def: StageDef): Shot[] | null {
  let beam: { shots: Shot[]; result: SimResult | null }[] = [{ shots: [], result: null }];
  const betterThan = (a: SimResult, b: SimResult): boolean =>
    a.pigsAlive < b.pigsAlive || (a.pigsAlive === b.pigsAlive && a.score > b.score);

  for (let birdIdx = 0; birdIdx < def.birds.length; birdIdx++) {
    const candidates: { shots: Shot[]; result: SimResult }[] = [];
    for (const prefix of beam) {
      for (const angleDeg of ANGLES) {
        for (const power of POWERS) {
          const shots = [...prefix.shots, { angleDeg, power }];
          const result = simulate(def, shots);
          if (result.cleared) return shots;
          if (result.canAim) candidates.push({ shots, result });
        }
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => (betterThan(a.result, b.result) ? -1 : 1));
    beam = candidates.slice(0, BEAM_WIDTH);
  }
  return null;
}

// ---------------------------------------------------------------------------
let allOk = true;
const t0 = Date.now();

for (const def of STAGES) {
  const stable = verifyStability(def);
  const deterministic = verifyDeterminism(def);
  const shots = findClearingShots(def);
  const clearable = shots !== null;
  const ok = stable && deterministic && clearable;
  allOk &&= ok;
  const shotDesc = shots
    ? shots.map((s) => `${s.angleDeg}°×${(s.power * 100) | 0}%`).join(', ')
    : '-';
  console.log(
    `Stage ${String(def.id).padStart(2)}: ${ok ? 'PASS' : 'FAIL'}` +
      ` | 안정성 ${stable ? 'OK' : 'NG'} | 재현성 ${deterministic ? 'OK' : 'NG'}` +
      ` | 클리어 ${clearable ? `OK (${shots!.length}/${def.birds.length}마리: ${shotDesc})` : 'NG — 클리어 불가'}`,
  );
}

console.log(`\n총 소요 ${((Date.now() - t0) / 1000).toFixed(1)}s — ${allOk ? '전체 PASS' : '실패 있음'}`);
process.exit(allOk ? 0 : 1);
