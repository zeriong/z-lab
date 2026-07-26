#!/usr/bin/env node
// 검증 하네스 (플랜 6단계 + 완료 정의 실측 지원)
//   1) 스테이지 10개 각각의 동봉 솔루션 리플레이 → 10/10 클리어 [A1·A4]
//   2) 결정성: 같은 솔루션 20회 반복 → 최종 바디 좌표 해시 동일 [가정 1 조기 검증]
//   3) 재구축 안정성: 세션 생성/해제 50회 → 바디 수·리스너 수 불변 [플랜 5단계]
// 사용: node tools/verify.mjs [--stage N] [--quick]

import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const require = createRequire(import.meta.url);
const Matter = require(join(ROOT, 'vendor/matter.min.js'));

const { runSolution } = await import(join(ROOT, 'js/core/driver.js'));
const { createSession } = await import(join(ROOT, 'js/core/session.js'));

const args = process.argv.slice(2);
const onlyStage = args.includes('--stage') ? Number(args[args.indexOf('--stage') + 1]) : null;
const quick = args.includes('--quick');

function loadStages() {
  const files = readdirSync(join(ROOT, 'stages')).filter(f => /^stage\d+\.json$/.test(f)).sort();
  return files.map(f => ({ file: f, data: JSON.parse(readFileSync(join(ROOT, 'stages', f), 'utf8')) }));
}

let failures = 0;
const stages = loadStages().filter(s => onlyStage == null || s.data.id === onlyStage);

// ── 0) 초기 안정성 — 발사 없이 300틱: 자체 붕괴·자살 클리어 금지 ──
console.log(`\n[0] 초기 안정성 (무발사 300틱)`);
for (const { file, data } of stages) {
  const s = createSession(Matter, data);
  const pigs0 = s.pigsLeft;
  for (let t = 0; t < 300; t++) s.step();
  const ok = s.pigsLeft === pigs0 && s.blocksDestroyed === 0 && !s.finished;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${file} — pigs ${pigs0}→${s.pigsLeft}, blocksDestroyed=${s.blocksDestroyed}, finished=${s.finished}`);
  s.dispose();
}

// ── 1) 솔루션 리플레이 10/10 ─────────────────────────────
console.log(`\n[1] 솔루션 리플레이 (${stages.length} 스테이지)`);
for (const { file, data } of stages) {
  if (!Array.isArray(data.solution) || data.solution.length === 0) {
    console.log(`  ✗ ${file} — 솔루션 시퀀스 없음`);
    failures++;
    continue;
  }
  const r = runSolution(Matter, data, data.solution);
  const ok = r.cleared;
  if (!ok) failures++;
  console.log(
    `  ${ok ? '✓' : '✗'} ${file} "${data.name}" — ${r.outcome ?? 'NO-VERDICT'} ` +
    `(path=${r.verdictPath}, shots=${r.shotsFired}/${data.birds}, pigsLeft=${r.pigsLeft}, ticks=${r.ticks})`
  );
}

// ── 2) 결정성 20회 (가정 1) ──────────────────────────────
if (!quick && stages.length > 0) {
  const target = stages[0];
  const N = 20;
  console.log(`\n[2] 결정성 시험 — ${target.file} 솔루션 ${N}회 반복`);
  const hashes = new Set();
  for (let i = 0; i < N; i++) hashes.add(runSolution(Matter, target.data, target.data.solution).hash);
  if (hashes.size === 1) {
    console.log(`  ✓ ${N}회 모두 동일 최종 상태 (해시 1종)`);
  } else {
    console.log(`  ✗ 비재현: ${hashes.size}종의 최종 상태 — 폴백(수동 클리어 기록) 발동 필요`);
    failures++;
  }
}

// ── 3) 재구축 50회 — 바디/리스너 수 불변 (플랜 5단계) ────────
if (!quick && stages.length > 0) {
  const target = stages[0];
  console.log(`\n[3] 세션 생성/해제 50회 — 카운터 불변`);
  const counts = new Set();
  for (let i = 0; i < 50; i++) {
    const s = createSession(Matter, target.data);
    // 매 신규 세션의 초기 카운터가 흔들리면 재구축 누수다
    counts.add(`bodies=${s.bodyCount()},listeners=${s.listenerCount()}`);
    // 발사 1회 섞어 오염 시나리오 재현(일시정지↔다시하기 연타 대역)
    s.launch(45, 0.8);
    for (let t = 0; t < 30; t++) s.step();
    s.dispose();
    if (s.listenerCount() !== 0) { counts.add(`leak@${i}`); }
  }
  if (counts.size === 1) {
    console.log(`  ✓ 50회 반복, 신규 세션 카운터 불변 (${[...counts][0]}), 해제 후 리스너 0`);
  } else {
    console.log(`  ✗ 카운터 흔들림/누수: ${[...counts].join(' | ')}`);
    failures++;
  }
}

// ── 4) 판정 경로 — settle 실패 / 타임아웃 강제 발화 (완료 정의 3) ──
if (!quick && stages.length > 0) {
  const target = stages[0].data;
  console.log(`\n[4] 판정 경로 시험`);

  // a) 전탄 빗나감 → settle 경로로 실패해야 한다 (영원한 대기 금지)
  const missShots = Array.from({ length: target.birds }, () => ({ angle: 80, power: 1 }));
  const rMiss = runSolution(Matter, target, missShots);
  const okMiss = rMiss.outcome === 'fail' && rMiss.verdictPath === 'settle';
  if (!okMiss) failures++;
  console.log(`  ${okMiss ? '✓' : '✗'} 전탄 빗나감 → ${rMiss.outcome}(path=${rMiss.verdictPath}, ticks=${rMiss.ticks})`);

  // b) 미세 진동이 영원히 남는 세계 → 타임아웃 경로가 강제 판정해야 한다
  const s = createSession(Matter, target);
  for (let i = 0; i < target.birds; i++) {
    s.launch(80, 1);
    for (let t = 0; t < 1200 && s.birdPhase === 'flying'; t++) {
      s.step();
      jiggle(s); // settle 방해
    }
  }
  let guard = 0;
  while (!s.finished && guard++ < 2000) { s.step(); jiggle(s); }
  function jiggle(sess) {
    const block = sess.allBodies().find(b => b.plugin.g?.kind === 'block');
    // 중력/마찰이 한 틱 안에 흡수하지 못할 만큼의 상시 진동
    if (block) Matter.Body.setVelocity(block, { x: 0.3, y: -0.65 });
  }
  const okTimeout = s.outcome === 'fail' && s.verdictPath === 'timeout';
  if (!okTimeout) failures++;
  console.log(`  ${okTimeout ? '✓' : '✗'} 진동 주입 → ${s.outcome}(path=${s.verdictPath}, tick=${s.tick})`);
  s.dispose();
}

console.log(failures === 0 ? '\n검증 통과' : `\n검증 실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
