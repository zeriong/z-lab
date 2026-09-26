// B2: 슬링샷 입력. Pointer Events만 사용(터치/마우스 이중 발화 방지), 포인터 id 하나만 추적.
// 하중 경로 hop 1~3: onPointerDown(잡기) → onPointerMove(dragVector) → onPointerUp(launch).
import { clampDrag, holdBird, launch, returnBirdToCup, type MBody, type StageWorld } from './physics';
import type { GameState } from './state';
import { SLINGSHOT, TUNING, type Vec2 } from './types';

export interface DragState {
  active: boolean;
  /** 컵 기준 당김 벡터(월드 px, maxPull로 클램프). 발사 속도 = -vector × k. */
  vector: Vec2;
  pointerId: number | null;
}

export interface SlingshotInputDeps {
  target: HTMLElement;
  getState(): GameState;
  getWorld(): StageWorld | null;
  /** 포인터 → 월드 좌표(카메라 포함). viewport.pointerToWorld. */
  toWorld(ev: { clientX: number; clientY: number }): Vec2;
  onGrab?(): void;
  onLaunch?(bird: MBody, drag: Vec2): void;
  /** 짧은 당김으로 취소됐을 때. */
  onCancel?(): void;
  /** 모든 pointerdown(오디오 언락용). */
  onAnyPointerDown?(): void;
}

export function initialDrag(): DragState {
  return { active: false, vector: { x: 0, y: 0 }, pointerId: null };
}

export class SlingshotInput {
  drag: DragState = initialDrag();

  private readonly onDown = (e: PointerEvent) => {
    this.deps.onAnyPointerDown?.();
    if (this.pointerDown(this.deps.toWorld(e), e.pointerId)) e.preventDefault();
  };
  private readonly onMove = (e: PointerEvent) => {
    this.pointerMove(this.deps.toWorld(e), e.pointerId);
  };
  private readonly onUp = (e: PointerEvent) => {
    this.pointerUp(this.deps.toWorld(e), e.pointerId);
  };
  private readonly onCancelEvt = (e: PointerEvent) => {
    if (this.drag.active && this.drag.pointerId === e.pointerId) this.cancel();
  };

  constructor(private readonly deps: SlingshotInputDeps) {}

  attach(): void {
    this.deps.target.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancelEvt);
  }

  detach(): void {
    this.deps.target.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancelEvt);
  }

  private dragFrom(p: Vec2): Vec2 {
    return clampDrag({ x: p.x - SLINGSHOT.x, y: p.y - SLINGSHOT.y });
  }

  /** hop 1. PLAYING && currentBird && 반경 grabRadius 안이면 잡는다. */
  pointerDown(p: Vec2, pointerId = 0): boolean {
    if (this.drag.active) return false;
    if (this.deps.getState() !== 'PLAYING') return false;
    const world = this.deps.getWorld();
    const bird = world?.currentBird ?? null;
    if (!world || !bird) return false;
    const dist = Math.hypot(p.x - bird.position.x, p.y - bird.position.y);
    if (dist > TUNING.grabRadius) return false;

    this.drag = { active: true, vector: this.dragFrom(p), pointerId };
    holdBird(world, this.drag.vector);
    this.deps.onGrab?.();
    return true;
  }

  /** hop 2. drag.active일 때만 dragVector 갱신(최대 당김 클램프). */
  pointerMove(p: Vec2, pointerId = 0): void {
    if (!this.drag.active || this.drag.pointerId !== pointerId) return;
    if (this.deps.getState() !== 'PLAYING') {
      this.cancel();
      return;
    }
    const world = this.deps.getWorld();
    if (!world || !world.currentBird) {
      this.cancel();
      return;
    }
    this.drag.vector = this.dragFrom(p);
    holdBird(world, this.drag.vector);
  }

  /** hop 3. |dragVector| > minPull 이면 launch(bird). */
  pointerUp(p: Vec2, pointerId = 0): MBody | null {
    if (!this.drag.active || this.drag.pointerId !== pointerId) return null;
    if (this.deps.getState() !== 'PLAYING') {
      this.cancel();
      return null;
    }
    const world = this.deps.getWorld();
    const vector = this.dragFrom(p);
    this.drag = initialDrag();
    if (!world) return null;

    const bird = launch(world, vector);
    if (bird) this.deps.onLaunch?.(bird, vector);
    else this.deps.onCancel?.();
    return bird;
  }

  /** 일시정지 등으로 드래그를 강제 취소. 새는 컵으로 돌아간다. */
  cancel(): void {
    if (!this.drag.active) return;
    this.drag = initialDrag();
    const world = this.deps.getWorld();
    if (world) returnBirdToCup(world);
    this.deps.onCancel?.();
  }
}
