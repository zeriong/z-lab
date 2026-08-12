import Matter from 'matter-js';
import { CATEGORY } from '../physics/world.js';
import {
  BIRD_RADIUS,
  BIRD_HIT_RADIUS_MULT,
  MAX_PULL,
  MIN_DRAG_DISTANCE,
  PULL_TO_VELOCITY_SCALE,
  MAX_BIRD_SPEED_PX_S,
  STOP_VELOCITY_THRESHOLD,
  STOP_DURATION_MS,
  OUT_OF_BOUNDS_MARGIN_X,
  OUT_OF_BOUNDS_MARGIN_Y,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '../config.js';

const { Bodies, Body, Composite, Vector } = Matter;

/**
 * 계획서 §4: 새총 조작(스폰/드래그/조준/발사)과 새 소진 판정(§6-5)을 담당한다.
 * 드래그 중에는 새 바디를 isStatic으로 유지하고 포인터 위치에 맞춰 Body.setPosition으로 직접 이동시킨다
 * (§4-1이 제시한 두 방식 — isStatic 직접 이동 / Constraint 목표점 갱신 — 중 전자를 채택. 상태가 더 단순함).
 *
 * @param {{
 *   world: Matter.World,
 *   canvas: HTMLCanvasElement,
 *   onLaunch?: (body: Matter.Body) => void,
 *   onBirdSettled?: (body: Matter.Body|null) => void,
 *   onAllBirdsSettled?: () => void,
 * }} options
 */
export function createSlingshot({ world, canvas, onLaunch, onBirdSettled, onAllBirdsSettled }) {
  let anchor = { x: 0, y: 0 };
  let birdOrder = [];
  let birdIndex = 0;
  let activeBird = null;
  let dragPointerId = null;
  let waitingForSettle = false;
  let stillTimeMs = 0;

  const bounds = {
    minX: -OUT_OF_BOUNDS_MARGIN_X,
    maxX: CANVAS_WIDTH + OUT_OF_BOUNDS_MARGIN_X,
    maxY: CANVAS_HEIGHT + OUT_OF_BOUNDS_MARGIN_Y,
  };

  /** 현재 스테이지의 앵커/새 순서로 상태를 리셋한다(§5-2 스테이지 전환). */
  function reset(newAnchor, newBirdOrder) {
    anchor = { ...newAnchor };
    birdOrder = newBirdOrder;
    birdIndex = 0;
    activeBird = null;
    dragPointerId = null;
    waitingForSettle = false;
    stillTimeMs = 0;
  }

  /** 다음 새를 앵커에 스폰한다. 남은 새가 없으면 null을 반환한다. */
  function spawnNext() {
    if (birdIndex >= birdOrder.length) {
      activeBird = null;
      return null;
    }
    const body = Bodies.circle(anchor.x, anchor.y, BIRD_RADIUS, {
      isStatic: true,
      friction: 0.5,
      restitution: 0.3,
      collisionFilter: { category: CATEGORY.BIRD },
    });
    body.plugin = { role: 'bird' };
    Composite.add(world, body);
    activeBird = body;
    birdIndex += 1;
    waitingForSettle = false;
    stillTimeMs = 0;
    return body;
  }

  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e) {
    if (!activeBird || !activeBird.isStatic || dragPointerId !== null) return;
    const pos = getPointerPos(e);
    const dist = Vector.magnitude(Vector.sub(pos, activeBird.position));
    if (dist > BIRD_RADIUS * BIRD_HIT_RADIUS_MULT) return;
    dragPointerId = e.pointerId;
    canvas.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e) {
    if (dragPointerId === null || e.pointerId !== dragPointerId || !activeBird) return;
    const pos = getPointerPos(e);
    const pull = Vector.sub(pos, anchor);
    const dist = Vector.magnitude(pull);
    const clamped = dist > MAX_PULL ? Vector.mult(Vector.normalise(pull), MAX_PULL) : pull;
    Body.setPosition(activeBird, Vector.add(anchor, clamped));
  }

  function handlePointerUp(e) {
    if (dragPointerId === null || e.pointerId !== dragPointerId || !activeBird) return;
    dragPointerId = null;

    // §4-3: 발사 방향은 "당긴 지점 -> 앵커" 벡터 방향 그대로.
    const pullVector = Vector.sub(anchor, activeBird.position);
    const dist = Vector.magnitude(pullVector);

    if (dist < MIN_DRAG_DISTANCE) {
      // §4-1: 최소 드래그 거리 미달 시 오조작으로 간주, 앵커로 복귀.
      Body.setPosition(activeBird, anchor);
      return;
    }

    const direction = Vector.normalise(pullVector);
    const clampedDist = Math.min(dist, MAX_PULL);
    const speedPxPerSec = Math.min(clampedDist * PULL_TO_VELOCITY_SCALE, MAX_BIRD_SPEED_PX_S);
    // Matter의 velocity는 고정 타임스텝(60Hz) 기준 "프레임당 이동량" 단위이므로 px/s를 60으로 나눈다.
    const velocity = Vector.mult(direction, speedPxPerSec / 60);

    Body.setStatic(activeBird, false);
    Body.setVelocity(activeBird, velocity);
    waitingForSettle = true;
    stillTimeMs = 0;
    onLaunch?.(activeBird);
  }

  /**
   * 매 물리 스텝 후 호출. 발사된 새의 정지/이탈을 판정해 다음 새 스폰 또는 소진 콜백을 트리거한다(§6-5).
   * @param {number} dtMs
   */
  function update(dtMs) {
    if (!activeBird || activeBird.isStatic || !waitingForSettle) return;

    const outOfBounds =
      activeBird.position.x < bounds.minX ||
      activeBird.position.x > bounds.maxX ||
      activeBird.position.y > bounds.maxY;

    if (outOfBounds) {
      Composite.remove(world, activeBird);
      activeBird = null;
      waitingForSettle = false;
      onBirdSettled?.(null);
      spawnNextOrFinish();
      return;
    }

    const speed = Vector.magnitude(activeBird.velocity);
    if (speed < STOP_VELOCITY_THRESHOLD) {
      stillTimeMs += dtMs;
      if (stillTimeMs >= STOP_DURATION_MS) {
        const settledBody = activeBird;
        activeBird = null;
        waitingForSettle = false;
        onBirdSettled?.(settledBody);
        spawnNextOrFinish();
      }
    } else {
      stillTimeMs = 0;
    }
  }

  function spawnNextOrFinish() {
    if (birdIndex < birdOrder.length) {
      spawnNext();
    } else {
      onAllBirdsSettled?.();
    }
  }

  function attach() {
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function detach() {
    canvas.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  return {
    reset,
    spawnNext,
    update,
    attach,
    detach,
    getActiveBird: () => activeBird,
    getAnchor: () => anchor,
    isDragging: () => dragPointerId !== null,
  };
}
