/**
 * 카메라 — 추적·프리뷰·흔들림 (R14, R17).
 *
 * 화면 밖에서 일어난 파괴는 일어나지 않은 것과 같다. 이 파일이 없으면
 * 넓은 스테이지(7·9·10)에서 "어디에 맞았는지"가 관측 불가능해진다.
 *
 * 좌표 규약: 월드 좌표는 y-down(픽셀과 같은 방향). 카메라는 월드 좌표의
 * 중심점 + zoom만 들고 있고, 실제 변환 행렬은 applyTransform이 만든다.
 */

import type { Vector } from 'matter-js';
import type { Rect } from '../data/schema';

type Mode = 'idle' | 'preview' | 'follow' | 'return';

const LERP_FOLLOW = 0.12;
const LERP_RETURN = 0.18; // 되돌아올 때 1.5배속(§3-14) — 0.12 × 1.5
const LERP_ZOOM = 0.08;

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  viewW = 1;
  viewH = 1;

  private mode: Mode = 'idle';
  private targetX = 0;
  private targetY = 0;
  private targetZoom = 1;
  private modeMs = 0;
  private previewMs = 0;

  private anchorX = 0;
  private anchorY = 0;
  private followTarget: (() => Vector | null) | null = null;

  private minZoom = 0.55;
  private maxZoom = 1.15;

  private shakeAmp = 0;
  private shakeMs = 0;
  private shakeTotal = 1;
  private shakeSeed = 0;
  shakeX = 0;
  shakeY = 0;

  setViewport(w: number, h: number): void {
    this.viewW = Math.max(1, w);
    this.viewH = Math.max(1, h);
  }

  setZoomBounds(min: number, max: number): void {
    this.minZoom = min;
    this.maxZoom = max;
  }

  /** 새총 대기 위치. 모든 되돌아오기의 목적지. */
  setAnchor(x: number, y: number): void {
    this.anchorX = x;
    this.anchorY = y;
  }

  /** 스테이지 진입 시 구조물을 훑는다 (R2: 1초 프리뷰 후 새총으로) */
  preview(rect: Rect, durationMs = 1000): void {
    this.mode = 'preview';
    this.modeMs = 0;
    this.previewMs = durationMs;
    this.targetX = rect.x + rect.w / 2;
    this.targetY = rect.y + rect.h / 2;
    this.targetZoom = this.fitZoom(rect);
    // 프리뷰는 즉시 그 자리에서 시작한다(스냅). 그래야 1초가 "훑는" 시간이 된다.
    this.x = this.targetX;
    this.y = this.targetY;
    this.zoom = this.targetZoom;
  }

  /** 비행 중인 새 추적. 대상을 화면 좌측 1/3 지점에 둔다. */
  follow(getTarget: () => Vector | null): void {
    this.followTarget = getTarget;
    this.mode = 'follow';
    this.modeMs = 0;
  }

  /** 턴 종료 → 새총으로 복귀 */
  returnToAnchor(): void {
    this.followTarget = null;
    this.mode = 'return';
    this.modeMs = 0;
    this.targetX = this.anchorX + this.viewW / (3 * Math.max(this.zoom, 0.01));
    this.targetY = this.anchorY - 60;
    this.targetZoom = this.maxZoom;
  }

  /** 즉시 새총 위치로 (스테이지 리셋 등) */
  snapToAnchor(): void {
    this.followTarget = null;
    this.mode = 'idle';
    this.zoom = this.maxZoom;
    this.x = this.anchorX + this.viewW / (3 * Math.max(this.zoom, 0.01));
    this.y = this.anchorY - 60;
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetZoom = this.zoom;
  }

  /** 화면 흔들림 (R17). 진폭 3px / 0.15초가 기본값. */
  shake(amp = 3, ms = 150): void {
    // 이미 흔들리는 중이면 더 센 쪽을 남긴다. 폭발이 겹칠 때 진폭이 누적돼
    // 화면이 요동치는 것을 막는다.
    if (amp >= this.shakeAmp) {
      this.shakeAmp = amp;
      this.shakeMs = ms;
      this.shakeTotal = ms;
    }
  }

  update(dtMs: number): void {
    this.modeMs += dtMs;

    if (this.mode === 'preview') {
      if (this.modeMs >= this.previewMs) this.returnToAnchor();
    }

    if (this.mode === 'follow' && this.followTarget) {
      const t = this.followTarget();
      if (t) {
        // 좌측 1/3에 두려면 카메라 중심은 대상보다 오른쪽으로 viewW/6 만큼.
        this.targetX = t.x + this.viewW / (6 * Math.max(this.zoom, 0.01));
        this.targetY = t.y - 40;
        this.targetZoom = this.maxZoom * 0.92;
      }
    }

    const k = this.mode === 'return' ? LERP_RETURN : LERP_FOLLOW;
    // dt 보정: 60fps 기준 계수를 프레임 시간에 맞춰 스케일한다.
    const a = 1 - Math.pow(1 - k, Math.max(dtMs, 1) / (1000 / 60));
    this.x += (this.targetX - this.x) * a;
    this.y += (this.targetY - this.y) * a;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.pow(1 - LERP_ZOOM, Math.max(dtMs, 1) / (1000 / 60)));
    this.zoom = clamp(this.zoom, this.minZoom, this.maxZoom);

    if (this.mode === 'return' && Math.abs(this.targetX - this.x) < 2 && Math.abs(this.targetY - this.y) < 2) {
      this.mode = 'idle';
    }

    this.updateShake(dtMs);
  }

  private updateShake(dtMs: number): void {
    if (this.shakeMs <= 0) {
      this.shakeAmp = 0;
      this.shakeX = 0;
      this.shakeY = 0;
      return;
    }
    this.shakeMs -= dtMs;
    this.shakeSeed += dtMs;
    const decay = Math.max(0, this.shakeMs / this.shakeTotal);
    const amp = this.shakeAmp * decay;
    // 결정적 흔들림. Math.random()을 쓰지 않는 이유는 시뮬레이션 계층과
    // 같은 규율을 렌더에도 지켜 로그 재현을 쉽게 하려는 것뿐이다.
    this.shakeX = Math.sin(this.shakeSeed * 0.09) * amp;
    this.shakeY = Math.cos(this.shakeSeed * 0.13) * amp;
    if (this.shakeMs <= 0) {
      this.shakeAmp = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  private fitZoom(rect: Rect): number {
    const zx = this.viewW / Math.max(rect.w, 1);
    const zy = this.viewH / Math.max(rect.h, 1);
    return clamp(Math.min(zx, zy) * 0.9, this.minZoom, this.maxZoom);
  }

  worldToScreen(p: Vector): Vector {
    return {
      x: (p.x - this.x) * this.zoom + this.viewW / 2 + this.shakeX,
      y: (p.y - this.y) * this.zoom + this.viewH / 2 + this.shakeY,
    };
  }

  /** 포인터 좌표 → 월드 좌표. 리사이즈 후에도 조준이 맞으려면 이 한 곳만 옳으면 된다(R19). */
  screenToWorld(sx: number, sy: number): Vector {
    return {
      x: (sx - this.viewW / 2 - this.shakeX) / this.zoom + this.x,
      y: (sy - this.viewH / 2 - this.shakeY) / this.zoom + this.y,
    };
  }

  /** ctx에 카메라 변환을 적용한다(호출자가 save/restore를 감싼다). */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.viewW / 2 + this.shakeX, this.viewH / 2 + this.shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
