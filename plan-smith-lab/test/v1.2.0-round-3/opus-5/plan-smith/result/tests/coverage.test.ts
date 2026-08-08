// 커버리지 대장 대조 — 계획서의 완료 정의 중 커맨드로 판정하는 항목들.
//   (a) 대장 마커가 정확히 25개, 각 1회, 집합이 B1–B25
//   (b) 스테이지 정의 10개 전부 검증 통과
//   (c) 별 임계 자리표시자 잔존 0건
//   (d) 물리 라이브러리 격리 — import 는 파일 1개, 엔진 자체 러너 사용 0건

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { stageDefs } from '../src/stages';
import { hasStarPlaceholder, validateStage } from '../src/stages/schema';

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const contents = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));

describe('커버리지 대장', () => {
  it('마커가 25개이고 각각 정확히 한 번씩 존재한다', () => {
    const counts = new Map<string, number>();
    for (const text of contents.values()) {
      const found = text.match(/B[0-9]+/g) ?? [];
      for (const m of found) counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    const expected = Array.from({ length: 25 }, (_, i) => `B${i + 1}`);
    expect([...counts.keys()].sort()).toEqual(expected.slice().sort());
    for (const [id, n] of counts) expect(`${id}:${n}`).toBe(`${id}:1`);
  });

  it('스테이지 정의가 10개이고 전부 검증을 통과한다', () => {
    expect(stageDefs.length).toBe(10);
    for (const def of stageDefs) expect(validateStage(def)).toEqual([]);
  });

  it('별 임계 자리표시자가 남아 있지 않다', () => {
    expect(stageDefs.filter(hasStarPlaceholder)).toEqual([]);
  });

  it('물리 라이브러리가 어댑터 한 파일에만 격리돼 있다', () => {
    const importers = [...contents.entries()].filter(([, t]) => t.includes('matter' + '-js'));
    expect(importers.length).toBe(1);
    expect(importers[0][0].endsWith('PhysicsAdapter.ts')).toBe(true);

    const runnerUsers = [...contents.values()].filter((t) => t.includes('Matter.' + 'Runner'));
    expect(runnerUsers.length).toBe(0);
  });
});
