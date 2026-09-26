/*
 * const.js — 좌표계와 상수 (§4.2 표 전부, 그 외 키 없음)
 * 노출: window.C
 * 참조 전역: 없음
 *
 * 좌표계: x 오른쪽 +, y 아래쪽 +, 중력 +y. 지면 상단 y = 620.
 * 이 값들은 §4.3 사거리 산술과 §5.5 피해 검산에 묶여 있으므로 바꾸지 않는다.
 */
(function () {
  'use strict';

  window.C = Object.freeze({
    // 월드 / 뷰포트
    WORLD_W: 1920,
    WORLD_H: 720,
    VIEW_W: 1280,
    VIEW_H: 720,
    GROUND_Y: 620,

    // 물리
    GRAVITY: 1300,            // px/s^2
    FIXED_DT: 1 / 120,        // 물리 고정 스텝(초)
    MAX_STEPS: 5,             // 프레임당 최대 서브스텝
    MAX_FRAME_DT: 0.25,       // 프레임 dt 상한(초)
    SOLVER_ITER: 8,           // 임펄스 반복 횟수
    PEN_SLOP: 0.5,            // 허용 관통(px)
    PEN_PERCENT: 0.6,         // 위치 보정 비율
    LINEAR_DAMP: 0.25,        // 선형 감쇠(1/s)
    SLEEP_SPEED: 6,           // 슬립 판정 속도(px/s)
    SLEEP_TIME: 0.6,          // 슬립까지 유지 시간(초)
    WAKE_SPEED: 30,           // 이웃이 이 속도 이상이면 깨움

    // 새총
    SLING_X: 200,             // 새총 앵커(새의 정지 위치) x
    SLING_Y: 500,             // 새총 앵커 y
    SLING_MAX_PULL: 110,      // 최대 당김 거리(px)
    SLING_GRAB_R: 70,         // 이 반경 안에서 드래그 시작
    LAUNCH_POWER: 11,         // 당김거리 -> 초기속도 배수
    MAX_LAUNCH_SPEED: 1400,   // 초기속도 상한(px/s)
    TRAJ_POINTS: 35,          // 궤적 예측 점 개수
    TRAJ_STEP: 0.06,          // 궤적 샘플 간격(초)

    // 피해
    DMG_MIN_SPEED: 150,       // 이 접근속도 미만은 무피해
    DMG_SCALE: 0.08,          // 피해 계수
    DMG_MASS_CAP: 3,          // 질량비 상한
    STATIC_MASS_FACTOR: 1.2,  // 정적 바디 충돌 시 유효 질량비

    // 샷 정리
    SETTLE_TIMEOUT: 8,        // 발사 후 강제 정리(초)
    SETTLE_GRACE: 0.9,        // 정지 판정 후 대기(초)

    // 점수
    SCORE_PIG: 5000,          // 돼지 처치 점수
    SCORE_BIRD_LEFT: 10000,   // 클리어 시 남은 새당 보너스

    // 폭탄새
    EXPLODE_R: 160,           // 폭발 반경(px)
    EXPLODE_IMPULSE: 900,     // 폭발 임펄스 세기
    EXPLODE_DMG: 140,         // 폭발 최대 피해

    // 저장
    SAVE_KEY: 'angrybird.progress.v1'
  });
})();
