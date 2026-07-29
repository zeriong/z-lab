// 슬링샷: 드래그 입력·클램프·발사·궤적 예측.
// 방식(플랜 5절): 드래그 중 새는 static(kinematic 대용)으로 포인터를 따라오고,
// 릴리즈 순간 setStatic(false) + setVelocity — Constraint 방식보다 제어·튜닝이 명확.

import { SLING, GRAVITY_PER_STEP, VW, VH } from '../constants.js';

const { Body } = Matter;

export class Slingshot {
  /**
   * @param canvas HTMLCanvasElement
   * @param getStage () => Stage
   * @param canControl () => boolean (Playing 상태에서만 true)
   */
  constructor(canvas, getStage, canControl) {
    this.canvas = canvas;
    this.getStage = getStage;
    this.canControl = canControl;

    this.dragging = false;
    this.activeBird = null;
    this.dragPos = null;
    this.trajectory = [];

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** 화면 좌표 → 1280x720 가상 좌표 (letterbox 스케일 역변환). */
  toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * VW,
      y: ((e.clientY - r.top) / r.height) * VH,
    };
  }

  onDown(e) {
    if (!this.canControl()) return;
    const stage = this.getStage();
    const bird = stage.currentBird;
    if (!bird || bird.plugin.ab.state !== 'loaded') return;

    const p = this.toWorld(e);
    const dist = Math.hypot(p.x - SLING.x, p.y - SLING.y);
    if (dist > SLING.grabRadius) return;

    this.dragging = true;
    this.activeBird = bird;
    bird.plugin.ab.state = 'dragging';
    this.updateDrag(p);
  }

  onMove(e) {
    if (!this.dragging) return;
    if (!this.canControl()) {
      this.cancelDrag();
      return;
    }
    this.updateDrag(this.toWorld(e));
  }

  onUp() {
    if (!this.dragging) return;
    this.dragging = false;
    const bird = this.activeBird;
    this.activeBird = null;
    this.trajectory = [];
    if (!bird || !bird.plugin.ab || bird.plugin.ab.state !== 'dragging') return;

    if (!this.canControl()) {
      this.resetBird(bird);
      return;
    }

    const pull = Math.hypot(SLING.x - bird.position.x, SLING.y - bird.position.y);
    if (pull < 8) {
      // 당김이 미미하면 발사하지 않고 원위치
      this.resetBird(bird);
      return;
    }

    // 발사 속도 = (앵커 - 놓은 위치) × 강성 계수
    const vx = (SLING.x - bird.position.x) * SLING.stiffness;
    const vy = (SLING.y - bird.position.y) * SLING.stiffness;
    Body.setStatic(bird, false);
    Body.setVelocity(bird, { x: vx, y: vy });
    bird.plugin.ab.state = 'flying';
    this.getStage().onLaunched();
  }

  updateDrag(p) {
    const bird = this.activeBird;
    if (!bird) return;
    // 최대 당김 반경 클램프
    let dx = p.x - SLING.x;
    let dy = p.y - SLING.y;
    const d = Math.hypot(dx, dy);
    if (d > SLING.maxPull) {
      dx = (dx / d) * SLING.maxPull;
      dy = (dy / d) * SLING.maxPull;
    }
    this.dragPos = { x: SLING.x + dx, y: SLING.y + dy };
    Body.setPosition(bird, this.dragPos);
    this.computeTrajectory();
  }

  /** 실제 물리와 동일 공식(스텝당 중력 증분)으로 포물선 점선 15개 계산. */
  computeTrajectory() {
    const pts = [];
    let x = this.dragPos.x;
    let y = this.dragPos.y;
    let vx = (SLING.x - x) * SLING.stiffness;
    let vy = (SLING.y - y) * SLING.stiffness;
    for (let i = 1; i <= 45; i++) {
      vy += GRAVITY_PER_STEP;
      x += vx;
      y += vy;
      if (i % 3 === 0) pts.push({ x, y });
    }
    this.trajectory = pts;
  }

  /** 일시정지 등 상태 이탈 시 드래그 취소. */
  cancelDrag() {
    const bird = this.activeBird;
    this.dragging = false;
    this.activeBird = null;
    this.trajectory = [];
    if (bird && bird.plugin.ab && bird.plugin.ab.state === 'dragging') {
      this.resetBird(bird);
    }
  }

  resetBird(bird) {
    Body.setPosition(bird, { x: SLING.x, y: SLING.y });
    bird.plugin.ab.state = 'loaded';
  }
}
