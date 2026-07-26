// 새총 드래그 입력 + 발사 + 비행 중 능력(탭) 처리.
// 포인터 이벤트를 월드 좌표로 변환해 다루고, 실제 발사 판정은 콜백으로 Game 레이어에 위임한다.
import Matter from "matter-js";
import type { PhysicsWorld, BirdPlugin } from "../core/physics";
import { Camera, screenToWorld } from "../render/camera";
import { BIRDS, LAUNCH_POWER, MAX_PULL_RADIUS } from "../data/birds";
import type { BirdType } from "../types";

const { Body } = Matter;

export interface SlingshotCallbacks {
  onLaunch: (bird: Matter.Body, type: BirdType, velocity: { x: number; y: number }) => void;
  onAbility: (bird: Matter.Body, type: BirdType) => void;
}

export class Slingshot {
  anchor: { x: number; y: number };
  currentBird: Matter.Body | null = null;
  currentBirdType: BirdType | null = null;
  isDragging = false;
  dragPos: { x: number; y: number } | null = null;

  private physics: PhysicsWorld;
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private cb: SlingshotCallbacks;
  private pointerDownAt: { x: number; y: number } | null = null;
  private enabled = true;

  constructor(physics: PhysicsWorld, canvas: HTMLCanvasElement, camera: Camera, anchor: { x: number; y: number }, cb: SlingshotCallbacks) {
    this.physics = physics;
    this.canvas = canvas;
    this.camera = camera;
    this.anchor = anchor;
    this.cb = cb;

    canvas.addEventListener("pointerdown", this.handleDown);
    canvas.addEventListener("pointermove", this.handleMove);
    window.addEventListener("pointerup", this.handleUp);
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) {
      this.isDragging = false;
      this.dragPos = null;
    }
  }

  /** 새총에 새로운 새를 장전한다 (정적 상태로 앵커에 배치) */
  loadBird(type: BirdType): Matter.Body {
    const spec = BIRDS[type];
    const body = this.physics.createBird(type, this.anchor.x, this.anchor.y);
    this.currentBird = body;
    this.currentBirdType = type;
    this.isDragging = false;
    this.dragPos = null;
    return body;
  }

  /** 비행 중인 새 (능력 발동 대상) 찾기: 발사됐고 아직 능력 미사용인 새 */
  private findActiveFlyingBird(): Matter.Body | null {
    for (const b of this.physics.allBodies()) {
      const plugin = b.plugin as BirdPlugin | undefined;
      if (plugin?.kind === "bird" && plugin.launched && !plugin.abilityUsed) {
        return b;
      }
    }
    return null;
  }

  private handleDown = (e: PointerEvent): void => {
    if (!this.enabled) return;
    const world = screenToWorld(this.canvas, this.camera, e.clientX, e.clientY);
    this.pointerDownAt = world;

    if (this.currentBird && this.currentBird.isStatic) {
      const dist = Math.hypot(world.x - this.currentBird.position.x, world.y - this.currentBird.position.y);
      if (dist <= BIRDS[this.currentBirdType!].radius * 3) {
        this.isDragging = true;
        this.dragPos = this.clampToRadius(world);
        Body.setPosition(this.currentBird, this.dragPos);
        return;
      }
    }
  };

  private handleMove = (e: PointerEvent): void => {
    if (!this.enabled || !this.isDragging || !this.currentBird) return;
    const world = screenToWorld(this.canvas, this.camera, e.clientX, e.clientY);
    this.dragPos = this.clampToRadius(world);
    Body.setPosition(this.currentBird, this.dragPos);
  };

  private handleUp = (e: PointerEvent): void => {
    if (!this.enabled) return;

    if (this.isDragging && this.currentBird && this.currentBirdType) {
      const pull = { x: this.anchor.x - this.currentBird.position.x, y: this.anchor.y - this.currentBird.position.y };
      const velocity = { x: pull.x * LAUNCH_POWER, y: pull.y * LAUNCH_POWER };
      const bird = this.currentBird;
      const type = this.currentBirdType;

      this.isDragging = false;
      this.dragPos = null;

      // 너무 약하게 당겼으면 발사하지 않고 원위치
      const pullDist = Math.hypot(pull.x, pull.y);
      if (pullDist < 12) {
        Body.setPosition(bird, this.anchor);
        return;
      }

      Body.setStatic(bird, false);
      Body.setVelocity(bird, velocity);
      (bird.plugin as BirdPlugin).launched = true;
      this.currentBird = null;
      this.currentBirdType = null;
      this.cb.onLaunch(bird, type, velocity);
      return;
    }

    // 드래그가 아니었다면 (탭) 비행 중인 새의 능력 발동 시도
    if (this.pointerDownAt) {
      const flying = this.findActiveFlyingBird();
      if (flying) {
        const plugin = flying.plugin as BirdPlugin;
        const spec = BIRDS[plugin.birdType];
        if (spec.hasAbility) {
          plugin.abilityUsed = true;
          this.cb.onAbility(flying, plugin.birdType);
        }
      }
    }
    this.pointerDownAt = null;
  };

  private clampToRadius(world: { x: number; y: number }): { x: number; y: number } {
    const dx = world.x - this.anchor.x;
    const dy = world.y - this.anchor.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= MAX_PULL_RADIUS) return world;
    const scale = MAX_PULL_RADIUS / dist;
    return { x: this.anchor.x + dx * scale, y: this.anchor.y + dy * scale };
  }

  /** 현재 당김 벡터 기준 예상 발사 속도 (궤적 예측/렌더용) */
  getLaunchVelocity(): { x: number; y: number } | null {
    if (!this.isDragging || !this.currentBird) return null;
    const pull = { x: this.anchor.x - this.currentBird.position.x, y: this.anchor.y - this.currentBird.position.y };
    return { x: pull.x * LAUNCH_POWER, y: pull.y * LAUNCH_POWER };
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.handleDown);
    this.canvas.removeEventListener("pointermove", this.handleMove);
    window.removeEventListener("pointerup", this.handleUp);
  }
}
