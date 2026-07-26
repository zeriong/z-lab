// 공유 상수 — 브라우저/Node 양쪽에서 import 된다.
// 수치 태깅(플랜 8절): settle 임계·판정 타임아웃·내구도·충격량 계수는 "초기값"이며,
// 스테이지 제작(7단계) 중 솔버/하네스 실측으로 교체되었다.

export const CONFIG = {
  WORLD: {
    width: 1280,
    height: 720,
    groundY: 640, // 지면 윗면 y
  },

  // 고정 타임스텝 — 캐논 도출(60Hz). rAF 루프가 이 dt로 수동 Engine.update 한다.
  DT_MS: 1000 / 60,

  SLING: {
    x: 220,
    y: 490,       // 발사 앵커(고무줄 정점)
    maxDrag: 110, // 최대 당김 반경(px)
    maxSpeed: 24, // 최대 발사 속도(px/step @60Hz)
  },

  BIRD: {
    radius: 16,
    density: 0.004,
    restitution: 0.35,
    friction: 0.5,
    frictionAir: 0.004,
  },

  PIG: {
    hp: 30,
    radius: 17,
    density: 0.0012,
    restitution: 0.25,
    friction: 0.5,
  },

  // 재질별 내구도/물성 — 스테이지 JSON은 재질 이름만 참조한다.
  MATERIALS: {
    glass: { hp: 30,  density: 0.0008, friction: 0.35, restitution: 0.05 },
    wood:  { hp: 70,  density: 0.0010, friction: 0.60, restitution: 0.10 },
    stone: { hp: 220, density: 0.0022, friction: 0.70, restitution: 0.05 },
  },

  DAMAGE: {
    scale: 0.22,      // damage = 0.5 * effMass * relN^2 * scale
    minRelSpeed: 2.0, // 이 미만의 접촉은 휴지 접촉으로 무시
    massCap: 8,       // 동적 가해자의 유효 질량 상한
    staticMass: 6,    // 정적 바디(지면 등)와의 충돌에 쓰는 유효 질량
  },

  VERDICT: {
    settleSpeed: 0.2,     // 모든 동적 바디 속도가 이 미만이면 "정지 후보"
    settleTicks: 45,      // 위 상태가 연속 유지되어야 하는 틱 수(0.75s)
    timeoutTicks: 600,    // 마지막 새 소진 후 settle 미도달 시 강제 판정(10s)
    birdSpentSpeed: 0.25, // 발사된 새가 "소진"으로 간주되는 속도 임계
    birdSpentTicks: 30,   // 위 상태 연속 유지 틱
    birdMaxFlight: 600,   // 발사 후 최대 비행 틱(10s) — 초과 시 강제 소진
  },

  // 월드 밖 정리 — 이탈 바디는 제거(돼지 이탈 = 사망)
  OOB: { minX: -300, maxX: 1900, maxY: 1100 },

  // 리플레이 오토파일럿 — 다음 발사 전 대기 규칙
  AUTOPILOT: {
    calmSpeed: 0.5,   // 월드가 이 속도 미만이면 다음 발사 가능
    minWaitTicks: 30, // 발사 가능 후 최소 대기
    maxWaitTicks: 480,// 이 이상 기다리면 그냥 발사(미세 진동 대비)
  },
};
