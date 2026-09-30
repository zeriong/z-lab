window.AB = window.AB || {};

// 새총 입력 상태·조준·예측 (계획서 §8.7). DOM/물리 무관한 순수 상태.
AB.Slingshot = class Slingshot {
  constructor(cfg) {
    this.cfg = cfg || AB.CONFIG.SLING;
    this.anchor = { x: this.cfg.x, y: this.cfg.y };
    this.dragging = false;
    this.birdPos = { x: this.anchor.x, y: this.anchor.y };
  }

  reset() {
    this.dragging = false;
    this.birdPos = { x: this.anchor.x, y: this.anchor.y };
  }

  // 일시정지 등으로 드래그를 취소할 때
  cancel() {
    this.reset();
  }

  // 앵커 반경 grabRadius 안이면 드래그 시작
  tryGrab(x, y) {
    const dx = x - this.anchor.x, dy = y - this.anchor.y;
    const r = this.cfg.grabRadius;
    if (dx * dx + dy * dy <= r * r) {
      this.dragging = true;
      return true;
    }
    return false;
  }

  // birdPos = 앵커 + clamp(포인터 − 앵커, maxPull)
  drag(x, y) {
    if (!this.dragging) return;
    let dx = x - this.anchor.x, dy = y - this.anchor.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const max = this.cfg.maxPull;
    if (d > max && d > 0) {
      dx *= max / d;
      dy *= max / d;
    }
    this.birdPos = { x: this.anchor.x + dx, y: this.anchor.y + dy };
  }

  // 현재 당김 거리(px)
  pull() {
    const dx = this.anchor.x - this.birdPos.x, dy = this.anchor.y - this.birdPos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 현재 위치에서 놓았을 때의 발사 속도(px/step) — 예측선용
  launchVelocity() {
    return {
      x: (this.anchor.x - this.birdPos.x) * this.cfg.powerPerPx,
      y: (this.anchor.y - this.birdPos.y) * this.cfg.powerPerPx
    };
  }

  // 놓기. 당김이 짧으면 null(취소, 새는 앵커로 복귀). 아니면 속도 반환(birdPos는 발사 위치로 유지).
  release() {
    this.dragging = false;
    if (this.pull() < this.cfg.minLaunchPull) {
      this.birdPos = { x: this.anchor.x, y: this.anchor.y };
      return null;
    }
    return this.launchVelocity();
  }

  // 이산 시뮬레이션. Matter의 Body.update와 같은 순서(감쇠 → 가속 → 위치)라 실제 궤적과 일치한다.
  predict(pos, v) {
    const C = AB.CONFIG;
    const f = C.BIRD.frictionAir;
    const g = C.GRAVITY_STEP;
    const limitY = C.GROUND_Y - C.BIRD.radius;
    const limitX = C.W + 20;
    let x = pos.x, y = pos.y, vx = v.x, vy = v.y;
    const pts = [];
    for (let i = 1; i <= C.PREDICT.steps; i++) {
      vx *= (1 - f);
      vy = vy * (1 - f) + g;
      x += vx;
      y += vy;
      if (i % C.PREDICT.everySteps === 0) pts.push({ x: x, y: y });
      if (y > limitY || x > limitX) break;
    }
    return pts;
  }
};
