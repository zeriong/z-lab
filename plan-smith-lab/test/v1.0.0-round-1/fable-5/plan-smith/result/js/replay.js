// 검증 하네스(개발 모드): 스테이지 JSON의 솔루션 발사 시퀀스를 자동 발사해
// 클리어 도달을 기계 재현한다(A1×A4 — 질문을 프로브로).
// 고정 타임스텝 하에서 동일 입력 → 동일 결과(명시적 가정 1)에 의존한다.

const SHOT_DELAY_MS = 600; // 장전 후 발사까지 대기 [초기값]

export class Replay {
  constructor(game) {
    this.game = game;
    this.queue = [];
    this.active = false;
    this.delay = 0;
  }

  start(solution) {
    this.queue = [...(solution || [])];
    this.active = this.queue.length > 0;
    this.delay = 0;
    if (!this.active) console.warn('[replay] 솔루션 시퀀스가 비어 있음');
  }

  stop() {
    this.active = false;
    this.queue = [];
  }

  // 매 물리 틱 호출(PLAYING 상태에서만).
  tick(dt) {
    if (!this.active) return;
    if (this.game.activeBird) { this.delay = 0; return; } // 비행 중 대기
    if (!this.game.loadedBird) return;                     // 재장전 대기
    if (this.queue.length === 0) { this.active = false; return; }

    this.delay += dt;
    if (this.delay >= SHOT_DELAY_MS) {
      this.delay = 0;
      const shot = this.queue.shift();
      this.game.sling.launchFromSolution(shot.angle, shot.power);
    }
  }
}
