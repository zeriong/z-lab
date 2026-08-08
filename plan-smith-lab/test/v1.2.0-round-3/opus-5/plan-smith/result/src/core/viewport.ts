// B23 — 캔버스 리사이즈·가상 좌표계
//
// 월드는 항상 1920x1080 가상 해상도로 그린다. 실제 캔버스는 창 크기에 맞춰
// 레터박스 스케일되며, 포인터 좌표는 역변환으로 항상 월드 좌표와 일치한다.

import { VIRTUAL_H, VIRTUAL_W } from '../physics/units';

export class Viewport {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D 컨텍스트를 얻지 못했습니다.');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
  }

  resize = (): void => {
    const cssW = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const cssH = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);

    this.scale = Math.min(cssW / VIRTUAL_W, cssH / VIRTUAL_H);
    this.offsetX = (cssW - VIRTUAL_W * this.scale) / 2;
    this.offsetY = (cssH - VIRTUAL_H * this.scale) / 2;
  };

  /** 매 프레임 시작에서 호출 — 레터박스 배경을 칠하고 가상 좌표계를 세운다. */
  begin(): void {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(this.dpr, this.dpr);
    ctx.fillStyle = 'rgb(12, 16, 24)';
    ctx.fillRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
    ctx.beginPath();
    ctx.rect(0, 0, VIRTUAL_W, VIRTUAL_H);
    ctx.clip();
  }

  end(): void {
    this.ctx.restore();
  }

  /** 포인터 이벤트 → 가상(월드 화면) 좌표. */
  toVirtual(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left - this.offsetX) / this.scale;
    const y = (clientY - rect.top - this.offsetY) / this.scale;
    return { x, y };
  }

  destroy(): void {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('orientationchange', this.resize);
  }
}
