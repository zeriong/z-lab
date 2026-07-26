#!/usr/bin/env node
// 스테이지 솔루션 탐색기 (플랜 7단계 제작 보조 — 게이트 아님)
// 그리디: 발사 1회분씩 각도×힘 그리드를 전수 시뮬레이션해 최다 돼지 제거
// (동률 시 누적 피해) 후보를 고정하고, 다음 발사로 넘어간다.
// 사용: node tools/solve.mjs stages/stage03.json

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const require = createRequire(import.meta.url);
const Matter = require(join(ROOT, 'vendor/matter.min.js'));
const { runSolution } = await import(join(ROOT, 'js/core/driver.js'));

const file = process.argv[2];
if (!file) { console.error('usage: node tools/solve.mjs stages/stageNN.json'); process.exit(1); }
const stage = JSON.parse(readFileSync(join(ROOT, file), 'utf8'));

const ANGLES = [];
for (let a = 4; a <= 82; a += 3) ANGLES.push(a);
const POWERS = [];
for (let p = 0.45; p <= 1.001; p += 0.05) POWERS.push(Number(p.toFixed(2)));

const totalPigs = stage.pigs.length;
let fixed = []; // 확정된 발사들

console.log(`solve ${file} — pigs=${totalPigs}, birds=${stage.birds}`);
for (let shot = 0; shot < stage.birds; shot++) {
  let best = null;
  for (const angle of ANGLES) {
    for (const power of POWERS) {
      const candidate = [...fixed, { angle, power }];
      const r = runSolution(Matter, stage, candidate, { maxTicks: 5400 });
      const killed = totalPigs - r.pigsLeft;
      const score = killed * 1e6 + r.damageDealt;
      if (!best || score > best.score) best = { angle, power, score, r };
      if (r.cleared) {
        fixed = candidate;
        console.log(`  shot#${shot + 1}: angle=${angle} power=${power} → CLEAR (path=${r.verdictPath})`);
        console.log(`\nsolution: ${JSON.stringify(fixed)}`);
        process.exit(0);
      }
    }
  }
  fixed = [...fixed, { angle: best.angle, power: best.power }];
  console.log(`  shot#${shot + 1}: angle=${best.angle} power=${best.power} → pigsLeft=${best.r.pigsLeft}, dmg=${best.r.damageDealt.toFixed(0)}`);
}

console.log(`\nno clearing sequence found. best-so-far: ${JSON.stringify(fixed)}`);
process.exit(2);
