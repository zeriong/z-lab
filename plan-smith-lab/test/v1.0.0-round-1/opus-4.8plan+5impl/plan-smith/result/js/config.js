/* config.js — 전역 상수 한 곳 모음.
 * 수치 태깅(플랜 §수치 태깅):
 *  - STEP_MS/60fps : (a) 파생 — 웹 애니메이션 프레임 예산 16.7ms.
 *  - MAX_LAUNCH_SPEED / MIN_BLOCK_THICKNESS : (b) 수명 한정 — 터널링 없는 최소값의 첫 측정치.
 *  - SETTLE_SPEED / SETTLE_STEPS : (b) 수명 한정 — 플레이테스트로 확정할 정지 감지 임계.
 *  - 점수 계수 : (c) 임의 선언.
 */
window.AB = window.AB || {};

(function (AB) {
  'use strict';

  var STEP_MS = 1000 / 60;              // (a) 파생
  var GRAVITY_Y = 1;                    // Matter 기본 중력
  var GRAVITY_SCALE = 0.001;            // Matter 기본 gravity.scale

  AB.CFG = {
    // ---- 캔버스 / 월드 ----
    WIDTH: 1280,
    HEIGHT: 720,
    GROUND_TOP: 660,                    // 지면 상단 y (스테이지 데이터의 기준면)
    GROUND_THICKNESS: 120,

    // ---- 시간 / 중력 ----
    STEP_MS: STEP_MS,
    GRAVITY_Y: GRAVITY_Y,
    GRAVITY_SCALE: GRAVITY_SCALE,
    // 엔진과 동일한 상수에서 파생한 "스텝당 가속도"(px/step^2).
    // 해석적 프리뷰(A2xA1)는 반드시 이 값을 써야 실제 호와 일치한다.
    G_PER_STEP: GRAVITY_Y * GRAVITY_SCALE * STEP_MS * STEP_MS,

    POSITION_ITERATIONS: 8,             // 터널링 완화
    VELOCITY_ITERATIONS: 8,
    CONSTRAINT_ITERATIONS: 4,

    // ---- 슬링샷 ----
    MAX_PULL: 130,                      // 최대 당김 거리(px)
    MAX_LAUNCH_SPEED: 16,               // (b) px/step 상한 = 약 960px/s, 최소 두께 30px보다 작게 유지
    GRAB_RADIUS: 90,                    // 새 주변 잡기 허용 반경
    PREVIEW_STEPS: 96,                  // 프리뷰 샘플 스텝 수
    PREVIEW_SAMPLE_EVERY: 3,            // 점선 간격(스텝)

    // ---- 발사체 ----
    BIRD_RADIUS: 18,
    BIRD_DENSITY: 0.004,
    BIRD_RESTITUTION: 0.32,
    BIRD_FRICTION: 0.5,
    // 공기저항 0 — 해석적 프리뷰 식(p = p0 + v0*n + g*n(n+1)/2)이 실제 호와 정확히 일치해야 하므로
    // 감쇠항을 두지 않는다(A2 허용오차 확보 + 사거리 여유).
    BIRD_AIR: 0,
    BIRD_TIMEOUT_STEPS: 420,            // 7초 후 강제 종료

    // ---- 돼지 ----
    PIG_RADIUS: 24,
    PIG_DENSITY: 0.0018,
    PIG_HP: 40,
    PIG_RESTITUTION: 0.22,

    // ---- 데미지 모델 ----
    MIN_BLOCK_THICKNESS: 30,            // (b) 저작 규칙: 이보다 얇은 블록 금지
    IMPACT_MIN_SPEED: 2.2,              // 이하 충돌은 데미지 없음(정지 잡음 차단)
    IMPACT_MASS_CLAMP: 8,               // 상대 바디 질량 상한
    STATIC_IMPACT_MASS: 4,              // 정적 바디(지면/벽)의 유효 질량
    DAMAGE_SCALE: 1.0,

    // ---- 정지 감지 (A3xA5 공유 조건) ----
    SETTLE_SPEED: 1.2,                  // (b) px/step
    SETTLE_STEPS: 30,                   // (b) 0.5초 연속 정지
    RESULT_DELAY_STEPS: 36,             // 판정 후 연출 여유(0.6초)

    // ---- 점수 (c) 임의 선언 ----
    SCORE_PIG: 5000,
    SCORE_BLOCK: 500,
    SCORE_BIRD_LEFT: 1000,

    STORAGE_KEY: 'ab-physics-progress'
  };

  // 재질 어휘 — 스테이지 스키마가 참조하는 물리 프리미티브 소어휘 (A1xA4 키스톤)
  AB.MATERIALS = {
    wood: {
      hp: 55, density: 0.002, friction: 0.55, restitution: 0.12,
      fill: '#c58a4a', stroke: '#8b5a26'
    },
    ice: {
      hp: 26, density: 0.0012, friction: 0.08, restitution: 0.16,
      fill: '#a9e2f7', stroke: '#5fb2d6'
    },
    stone: {
      hp: 140, density: 0.005, friction: 0.7, restitution: 0.06,
      fill: '#9aa4ae', stroke: '#616a74'
    }
  };
})(window.AB);
