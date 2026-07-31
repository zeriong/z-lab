// 슬링샷: 드래그 벡터 → 발사 임펄스 변환, 궤적 점선 프리뷰.
// 동일 드래그 → 동일 발사 속도(결정적). 솔루션 리플레이도 같은 launch 경로를 탄다.

import {
  MAX_PULL, MAX_LAUNCH_SPEED, MIN_LAUNCH_PULL, GRAVITY_STEP, GROUND_Y,
} from './constants.js';

const { Body } = Matter;

export class Slingshot {
  constructor(anchor) {
    this.anchor = { x: anchor.x, y: anchor.y };
    this.bird = null;        // 장전된 새(static)
    this.dragging = false;
    this.pull = { x: 0, y: 0 };
    this.onLaunch = null;    // (bird) => void
  }

  load(bird) {
    this.bird = bird;
    this.dragging = false;
    this.pull = { x: 0, y: 0 };
    Body.setPosition(bird, { x: this.anchor.x, y: this.anchor.y });
  }

  pointerDown(pos) {
    if (!this.bird) return;
    const d = Math.hypot(pos.x - this.anchor.x, pos.y - this.anchor.y);
    if (d < 70) {
      this.dragging = true;
      this.updatePull(pos);
    }
  }

  pointerMove(pos) {
    if (this.dragging) this.updatePull(pos);
  }

  updatePull(pos) {
    let dx = pos.x - this.anchor.x;
    let dy = pos.y - this.anchor.y;
    const d = Math.hypot(dx, dy);
    if (d > MAX_PULL) {
      dx *= MAX_PULL / d;
      dy *= MAX_PULL / d;
    }
    this.pull = { x: dx, y: dy };
    Body.setPosition(this.bird, {
      x: this.anchor.x + dx,
      y: this.anchor.y + dy,
    });
  }

  pointerUp() {
    if (!this.dragging || !this.bird) return;
    this.dragging = false;
    const d = Math.hypot(this.pull.x, this.pull.y);
    if (d < MIN_LAUNCH_PULL) {
      // 발사 취소 — 새를 앵커로 복귀
      Body.setPosition(this.bird, { x: this.anchor.x, y: this.anchor.y });
      this.pull = { x: 0, y: 0 };
      return;
    }
    const speed = (d / MAX_PULL) * MAX_LAUNCH_SPEED;
    const vx = (-this.pull.x / d) * speed;
    const vy = (-this.pull.y / d) * speed;
    this.launch(vx, vy);
  }

  launch(vx, vy) {
    const bird = this.bird;
    if (!bird) return;
    this.bird = null;
    this.pull = { x: 0, y: 0 };
    Body.setStatic(bird, false);
    Body.setVelocity(bird, { x: vx, y: vy });
    if (this.onLaunch) this.onLaunch(bird);
  }

  // 리플레이 하네스용: 각도(라디안, 위쪽=음수)·파워(0..1)로 발사.
  launchFromSolution(angle, power) {
    if (!this.bird) return;
    const speed = power * MAX_LAUNCH_SPEED;
    this.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  // 발사 전 궤적 점선 프리뷰. 엔진과 같은 스텝 공식(GRAVITY_STEP)을 사용.
  previewPoints() {
    if (!this.dragging) return [];
    const d = Math.hypot(this.pull.x, this.pull.y);
    if (d < MIN_LAUNCH_PULL) return [];
    const speed = (d / MAX_PULL) * MAX_LAUNCH_SPEED;
    let vx = (-this.pull.x / d) * speed;
    let vy = (-this.pull.y / d) * speed;
    let x = this.anchor.x + this.pull.x;
    let y = this.anchor.y + this.pull.y;
    const pts = [];
    for (let i = 0; i < 90; i++) {
      x += vx;
      y += vy;
      vy += GRAVITY_STEP;
      if (i % 5 === 0) pts.push({ x, y });
      if (y > GROUND_Y + 20) break;
    }
    return pts;
  }
}
