/**
 * §5.1 슬링샷.
 * 물리 constraint(고무줄)로 당겼다 놓는 방식은 놓는 순간 속도가 예측 불가라
 * 궤적 예측선과 실제가 어긋난다. 속도를 직접 지정하는 방식을 쓴다.
 */

import { Body, Vector } from 'matter-js';
import type { GameWorld } from './world';
import { getGame } from './entities';

export const MAX_PULL = 110; // px
export const LAUNCH_SCALE = 0.22; // 최대 속도 = 110 * 0.22 = 24.2 px/step
export const GRAB_RADIUS = 120; // 이 반경 안에서 pointerdown 해야 잡힘
export const CANCEL_PULL = 12; // 이보다 짧게 당기면 발사 취소
export const MAX_LAUNCH_SPEED = 28; // §17 관통 리스크 — 속도 상한

export interface AimState {
  dragging: boolean;
  /** 앵커에서 새까지의 역벡터 (당긴 양) */
  pull: Vector;
  /** 새가 놓일 위치 */
  birdPos: Vector;
  /** 발사 속도 */
  launchVel: Vector;
  /** 0..1 */
  power: number;
}

function clampMagnitude(v: Vector, max: number): Vector {
  const m = Vector.magnitude(v);
  if (m <= max || m === 0) return v;
  return Vector.mult(v, max / m);
}

export class Slingshot {
  private dragging = false;
  private pull: Vector = { x: 0, y: 0 };
  /** 키보드 조작용 (§5.1 접근성) */
  private aimDeg = -35; // 0 = 오른쪽, 음수 = 위
  private aimPower = 0.75;

  constructor(private gw: GameWorld) {}

  /** 슬링샷 포켓(새가 놓이는 지점) */
  anchor(): Vector {
    const s = this.gw.stage.sling;
    const r = this.gw.bird ? (getGame(this.gw.bird)?.radius ?? 14) : 14;
    return { x: s.x, y: s.y - r };
  }

  isDragging(): boolean {
    return this.dragging;
  }

  state(): AimState {
    const a = this.anchor();
    const birdPos = Vector.sub(a, this.pull);
    const launchVel = this.limit(Vector.mult(this.pull, LAUNCH_SCALE));
    return {
      dragging: this.dragging,
      pull: this.pull,
      birdPos,
      launchVel,
      power: Vector.magnitude(this.pull) / MAX_PULL,
    };
  }

  /** 새 위 근처에서 눌렀는가? */
  canGrab(worldPt: Vector): boolean {
    const bird = this.gw.bird;
    if (!bird) return false;
    return Vector.magnitude(Vector.sub(worldPt, bird.position)) <= GRAB_RADIUS;
  }

  beginDrag(worldPt: Vector): void {
    this.dragging = true;
    this.moveTo(worldPt);
  }

  moveTo(worldPt: Vector): void {
    const a = this.anchor();
    this.pull = clampMagnitude(Vector.sub(a, worldPt), MAX_PULL);
    this.syncBird();
  }

  /** 키보드 조준(←→ 각도 1도, ↑↓ 파워 2%) */
  nudgeAngle(deltaDeg: number): void {
    this.aimDeg = Math.max(-89, Math.min(89, this.aimDeg + deltaDeg));
    this.applyKeyboardAim();
  }

  nudgePower(delta: number): void {
    this.aimPower = Math.max(0.05, Math.min(1, this.aimPower + delta));
    this.applyKeyboardAim();
  }

  /** 키보드 조작이 시작되면 드래그 상태로 들어간다(예측선을 보여주기 위해). */
  applyKeyboardAim(): void {
    this.dragging = true;
    const rad = (this.aimDeg * Math.PI) / 180;
    const dir: Vector = { x: Math.cos(rad), y: Math.sin(rad) };
    this.pull = Vector.mult(dir, MAX_PULL * this.aimPower);
    this.syncBird();
  }

  /** 조준 중 새는 static으로 두고 setPosition으로만 옮긴다(솔버 개입 차단). */
  private syncBird(): void {
    const bird = this.gw.bird;
    if (!bird) return;
    const pos = Vector.sub(this.anchor(), this.pull);
    Body.setPosition(bird, pos);
  }

  private limit(v: Vector): Vector {
    return clampMagnitude(v, MAX_LAUNCH_SPEED);
  }

  /** pointerup. 발사됐으면 true, 취소면 false. */
  release(): boolean {
    const bird = this.gw.bird;
    if (!bird) {
      this.dragging = false;
      return false;
    }
    const st = this.state();
    if (Vector.magnitude(this.pull) < CANCEL_PULL) {
      this.cancel();
      return false;
    }

    Body.setStatic(bird, false);
    Body.setPosition(bird, st.birdPos);
    Body.setVelocity(bird, st.launchVel);
    Body.setAngularVelocity(bird, st.launchVel.x * 0.01);

    this.dragging = false;
    this.pull = { x: 0, y: 0 };
    this.gw.birdsUsed++;
    this.gw.launchStep = this.gw.step;
    return true;
  }

  /** 발사 취소 — 새를 앵커로 되돌린다. */
  cancel(): void {
    this.dragging = false;
    this.pull = { x: 0, y: 0 };
    this.syncBird();
  }

  /** 다음 새 장전 시 조준값 초기화 */
  reset(): void {
    this.dragging = false;
    this.pull = { x: 0, y: 0 };
    this.aimDeg = -35;
    this.aimPower = 0.75;
  }
}
