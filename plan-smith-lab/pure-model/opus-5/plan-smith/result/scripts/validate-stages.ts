/**
 * npm run validate:stages  (R33, §13-4)
 *
 * 검사 항목 (§13-4가 열거한 그대로):
 *   - 스키마 적합         → safeParseStage
 *   - 돼지 ≥ 1 / 새 ≥ 1   → validateStageContent
 *   - 초기 바디 겹침 0쌍   → validateStageContent
 *   - 참조 재질 존재       → 파서 + 콘텐츠 검사(이중)
 *   - 바디 수 ≤ 80        → validateStageContent
 * 여기에 더해 "파일이 정확히 10개이고 id가 1..10 중복 없이 전부"를 본다.
 * 이게 없으면 §12의 "10스테이지가 1스테이지 + 로더로 퇴화"를 커맨드가 못 잡는다.
 *
 * 성공 시 표준출력 마지막 줄: `10/10 stages valid`
 * 실패 시 위반을 파일명 + 필드 경로로 찍고 종료코드 1.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeParseStage, validateStageContent, STAGE_COUNT, type StageDef } from '../src/data/schema';

const here = dirname(fileURLToPath(import.meta.url));
const stagesDir = join(here, '..', 'src', 'data', 'stages');

interface FileReport {
  file: string;
  issues: string[];
  def: StageDef | null;
}

function readStageFiles(): string[] {
  return readdirSync(stagesDir)
    .filter((name) => /^\d{2}\.json$/.test(name))
    .sort();
}

function checkFile(file: string): FileReport {
  const full = join(stagesDir, file);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(full, 'utf8'));
  } catch (err) {
    return { file, issues: [`JSON 파싱 실패: ${(err as Error).message}`], def: null };
  }

  const parsed = safeParseStage(raw, file);
  if (!parsed.ok) return { file, issues: parsed.issues, def: null };

  const contentIssues = validateStageContent(parsed.value);

  // 파일명과 id의 일치 — 파일을 복사해 만들 때 가장 흔한 실수다.
  const expectedId = Number(file.slice(0, 2));
  if (parsed.value.id !== expectedId) {
    contentIssues.push(`파일명(${file})과 id(${parsed.value.id})가 다릅니다`);
  }

  return { file, issues: contentIssues, def: parsed.value };
}

function main(): void {
  const files = readStageFiles();
  const reports = files.map(checkFile);

  let failed = 0;
  for (const report of reports) {
    if (report.issues.length === 0) {
      const def = report.def;
      const bodies = def ? def.bodies.length + def.pigs.length + def.ground.length : 0;
      console.log(
        `  OK   ${report.file}  ${def?.name ?? ''} — 바디 ${bodies}, 돼지 ${def?.pigs.length ?? 0}, 새 ${def?.birds.length ?? 0}, 3별 ${def?.targetScore ?? 0}`,
      );
    } else {
      failed += 1;
      console.error(`  FAIL ${report.file}`);
      report.issues.forEach((issue) => console.error(`         - ${issue}`));
    }
  }

  const structural: string[] = [];
  if (files.length !== STAGE_COUNT) {
    structural.push(`스테이지 파일이 ${files.length}개입니다 (요구: ${STAGE_COUNT}개)`);
  }
  const ids = reports.filter((r) => r.def).map((r) => r.def!.id);
  const unique = new Set(ids);
  if (unique.size !== ids.length) structural.push(`중복된 id가 있습니다: [${ids.join(', ')}]`);
  for (let id = 1; id <= STAGE_COUNT; id += 1) {
    if (!unique.has(id)) structural.push(`id ${id} 스테이지가 없습니다`);
  }

  structural.forEach((msg) => console.error(`  FAIL (전체) - ${msg}`));

  const validCount = reports.length - failed;
  if (failed > 0 || structural.length > 0) {
    console.error(`\n${validCount}/${STAGE_COUNT} stages valid`);
    process.exit(1);
  }

  console.log(`\n${validCount}/${STAGE_COUNT} stages valid`);
}

main();
