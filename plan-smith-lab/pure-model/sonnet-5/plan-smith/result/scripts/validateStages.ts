import { STAGES } from '../src/stages';

function fail(message: string): never {
  console.error(`[validateStages] FAIL: ${message}`);
  process.exit(1);
}

/**
 * 스텝 11 — 스테이지별 데이터 유효성 검증 스크립트(모든 필수 필드 not-null, exit 0).
 * 완료의 정의: 10개 스테이지 데이터 파일이 모두 존재하고, 각각 최소 1개 이상의 돼지·
 * 1개 이상의 파괴 가능 구조물·유효한 새총 앵커 좌표를 갖는다.
 * 실행: npm run validate:stages
 */
function validate(): void {
  if (STAGES.length !== 10) {
    fail(`expected 10 stages, found ${STAGES.length}`);
  }

  STAGES.forEach((stage, index) => {
    const label = `stage[${index}] (id=${stage.id})`;

    if (stage.pigs.length < 1) fail(`${label}: at least 1 pig required`);
    if (stage.blocks.length < 1) fail(`${label}: at least 1 destructible block required`);
    if (stage.terrain.length < 1) fail(`${label}: at least 1 terrain segment required`);

    if (
      stage.slingshot?.anchor == null ||
      Number.isNaN(stage.slingshot.anchor.x) ||
      Number.isNaN(stage.slingshot.anchor.y)
    ) {
      fail(`${label}: invalid slingshot anchor`);
    }

    if (!stage.background) fail(`${label}: missing background`);
    if (!Number.isFinite(stage.projectileCount) || stage.projectileCount < 1) {
      fail(`${label}: invalid projectileCount`);
    }

    stage.blocks.forEach((block, bi) => {
      if (block.id == null || block.material == null) {
        fail(`${label}: block[${bi}] missing id/material`);
      }
      if (!Number.isFinite(block.x) || !Number.isFinite(block.y)) {
        fail(`${label}: block[${bi}] invalid position`);
      }
    });

    stage.pigs.forEach((pig, pi) => {
      if (pig.id == null) fail(`${label}: pig[${pi}] missing id`);
      if (!Number.isFinite(pig.x) || !Number.isFinite(pig.y)) {
        fail(`${label}: pig[${pi}] invalid position`);
      }
    });

    stage.terrain.forEach((platform, ti) => {
      if (!Number.isFinite(platform.x) || !Number.isFinite(platform.y)) {
        fail(`${label}: terrain[${ti}] invalid position`);
      }
    });
  });

  console.log(`[validateStages] OK: all ${STAGES.length} stages valid`);
  process.exit(0);
}

validate();
