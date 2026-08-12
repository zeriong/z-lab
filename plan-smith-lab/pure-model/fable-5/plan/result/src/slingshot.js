// 슬링샷 — 드래그 입력·클램프·발사·궤적 예측 (§3.2, §3.3).
// Constraint(고무줄) 대신 "드래그 중 수동 배치 → 발사 순간 setVelocity" 방식 (§3.2 결정).

import { WIDTH, HEIGHT, GROUND_TOP, GRAVITY_PER_TICK } from './physics.js';

const { Body } = window.Matter;

const MAX_PULL = 90; // 기준점에서 최대 당김 반경(px)
const MIN_PULL = 15; // 미만이면 발사 취소(오발 방지)
const POWER = 0.18; // 발사속도 = POWER × (기준점 − 당긴위치)
const MAX_SPEED = 24; // 터널링 방지 속도 상한 (§1.1)
const GRAB_MARGIN = 30; // 새 근처 판정 여유 반경

export class Slingshot {
  // hooks: { isActive(): boolean, onLaunch(birdBody) }
  constructor(canvas, anchor, hooks) {
    this.canvas = canvas;
    this.anchor = { x: anchor.x, y: anchor.y };
    this.hooks = hooks;
    this.bird = null; // 장전된 새(발사 전, static)
    this.dragging = false;

    this._onDown = (e) => this.handleDown(e);
    this._onMove = (e) => this.handleMove(e);
    this._onUp = (e) => this.handleUp(e);

    canvas.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointercancel', this._onUp);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('pointercancel', this._onUp);
    this.bird = null;
    this.dragging = false;
  }

  load(bird) {
    this.bird = bird;
    this.dragging = false;
    Body.setPosition(bird, { x: this.anchor.x, y: this.anchor.y });
  }

  // CSS 스케일된 캔버스 좌표 → 논리 좌표(1280x720)
  toWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  handleDown(e) {
    if (!this.hooks.isActive() || !this.bird || this.dragging) return;
    const p = this.toWorld(e);
    const dx = p.x - this.bird.position.x;
    const dy = p.y - this.bird.position.y;
    const grabR = this.bird.circleRadius + GRAB_MARGIN;
    if (dx * dx + dy * dy <= grabR * grabR) {
      this.dragging = true;
      e.preventDefault();
    }
  }

  handleMove(e) {
    if (!this.dragging || !this.bird) return;
    if (!this.hooks.isActive()) {
      // 일시정지 등으로 비활성화되면 드래그 취소
      this.dragging = false;
      Body.setPosition(this.bird, { x: this.anchor.x, y: this.anchor.y });
      return;
    }
    const p = this.toWorld(e);
    let dx = p.x - this.anchor.x;
    let dy = p.y - this.anchor.y;
    const len = Math.hypot(dx, dy);
    if (len > MAX_PULL) {
      dx = (dx / len) * MAX_PULL;
      dy = (dy / len) * MAX_PULL;
    }
    Body.setPosition(this.bird, { x: this.anchor.x + dx, y: this.anchor.y + dy });
  }

  handleUp() {
    if (!this.dragging || !this.bird) return;
    this.dragging = false;
    const pull = Math.hypot(
      this.anchor.x - this.bird.position.x,
      this.anchor.y - this.bird.position.y
    );
    if (pull < MIN_PULL || !this.hooks.isActive()) {
      // 발사 취소 — 새를 기준점으로 복귀
      Body.setPosition(this.bird, { x: this.anchor.x, y: this.anchor.y });
      return;
    }
    const v = this.launchVelocity();
    const bird = this.bird;
    this.bird = null;
    Body.setStatic(bird, false);
    Body.setVelocity(bird, v);
    this.hooks.onLaunch(bird);
  }

  launchVelocity() {
    let vx = (this.anchor.x - this.bird.position.x) * POWER;
    let vy = (this.anchor.y - this.bird.position.y) * POWER;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_SPEED) {
      vx = (vx / speed) * MAX_SPEED;
      vy = (vy / speed) * MAX_SPEED;
    }
    return { x: vx, y: vy };
  }

  // 드래그 중 등가속 포물선 샘플링 — 점 최대 15개, 공기저항 0 근사 (§3.3)
  getTrajectory() {
    if (!this.dragging || !this.bird) return [];
    const pull = Math.hypot(
      this.anchor.x - this.bird.position.x,
      this.anchor.y - this.bird.position.y
    );
    if (pull < MIN_PULL) return [];

    const v = this.launchVelocity();
    let x = this.bird.position.x;
    let y = this.bird.position.y;
    let vx = v.x;
    let vy = v.y;
    const points = [];
    for (let tick = 1; tick <= 60 && points.length < 15; tick++) {
      vy += GRAVITY_PER_TICK; // Matter와 동일한 순서: 중력 적용 후 이동
      x += vx;
      y += vy;
      if (y > GROUND_TOP - 4) break;
      if (tick % 4 === 0) points.push({ x, y });
    }
    return points;
  }
}
