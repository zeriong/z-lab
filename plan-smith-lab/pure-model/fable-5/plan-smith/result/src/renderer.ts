// 렌더링 (M14) — Canvas 2D, 도형+색 (A3, 에셋 0).
// 물리 어댑터의 스냅샷만 소비한다 — Matter 미접촉 (§13).

import type { Game } from './game';
import { BIRD, MATERIALS, PIG, SLING, WORLD } from './config';
import { scene } from './scene';

export class Renderer {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private game: Game,
  ) {}

  draw(): void {
    const { ctx } = this;
    // 하늘
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    sky.addColorStop(0, '#7ec8f2');
    sky.addColorStop(1, '#cfeefb');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // 지면
    ctx.fillStyle = '#7cb85c';
    ctx.fillRect(0, WORLD.groundY, WORLD.width, 14);
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(0, WORLD.groundY + 14, WORLD.width, WORLD.height - WORLD.groundY - 14);

    const s = scene();
    const inWorld = (s === 'PLAYING' || s === 'PAUSED' || s === 'CLEAR' || s === 'FAIL') && this.game.stage !== null;
    if (!inWorld) return; // MAIN/SELECT은 DOM 오버레이가 화면을 가진다

    this.drawTrajectory();
    this.drawSlingBack();
    this.drawEntities();
    this.drawGhostBird();
    this.drawSlingFront();
    this.drawParticles();
    this.drawPopups();
    this.drawHud();
  }

  // ── 슬링샷 (M6) — 뒤 기둥 → 새 → 앞 기둥/밴드 순으로 겹침 ──

  private drawSlingBack(): void {
    const { ctx } = this;
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(SLING.x - 7, SLING.y - 4, 14, WORLD.groundY - SLING.y + 4);
    // 뒤쪽(왼쪽) 프롱
    ctx.strokeStyle = '#57391f';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(SLING.x, SLING.y);
    ctx.lineTo(SLING.x - 14, SLING.y - 36);
    ctx.stroke();
    // 당기는 동안 고무줄 밴드(뒤 가닥) — 당김 방향이 항상 보인다 (§3)
    if (this.game.dragging) {
      ctx.strokeStyle = '#3d2a17';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(SLING.x - 14, SLING.y - 36);
      ctx.lineTo(this.game.birdPos.x, this.game.birdPos.y);
      ctx.stroke();
    }
  }

  private drawSlingFront(): void {
    const { ctx } = this;
    if (this.game.dragging) {
      ctx.strokeStyle = '#3d2a17';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(SLING.x + 14, SLING.y - 36);
      ctx.lineTo(this.game.birdPos.x, this.game.birdPos.y);
      ctx.stroke();
    }
    // 앞쪽(오른쪽) 프롱
    ctx.strokeStyle = '#6b4a2b';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(SLING.x, SLING.y);
    ctx.lineTo(SLING.x + 14, SLING.y - 36);
    ctx.stroke();
  }

  /** 궤적 예측 점선 (M8) — 당기는 동안 실시간 갱신 */
  private drawTrajectory(): void {
    const pts = this.game.trajectory();
    if (pts.length === 0) return;
    const { ctx } = this;
    pts.forEach((p, i) => {
      const alpha = 0.85 * (1 - i / pts.length) + 0.15;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── 엔티티 ──

  private drawEntities(): void {
    for (const e of this.game.entities.values()) {
      const snap = this.game.physics.get(e.bodyId);
      if (!snap) continue;
      if (e.kind === 'block') this.drawBlock(snap.x, snap.y, snap.angle, e.w, e.h, e.material, e.hp, e.maxHp);
      else if (e.kind === 'pig') this.drawPig(snap.x, snap.y, e.r, e.hp, e.maxHp);
      else this.drawBird(snap.x, snap.y, e.r);
    }
  }

  private drawBlock(
    x: number,
    y: number,
    angle: number,
    w: number,
    h: number,
    material: keyof typeof MATERIALS,
    hp: number,
    maxHp: number,
  ): void {
    const { ctx } = this;
    const m = MATERIALS[material];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = m.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = m.edge;
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    // 손상 표시 — hp 비율만큼 어둡게
    const dmg = 1 - Math.max(hp, 0) / maxHp;
    if (dmg > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(dmg * 0.45).toFixed(3)})`;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }

  private drawPig(x: number, y: number, r: number, hp: number, maxHp: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = PIG.color;
    ctx.strokeStyle = PIG.edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 코
    ctx.fillStyle = '#5cb838';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.42, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d7a24';
    ctx.beginPath();
    ctx.arc(-r * 0.15, r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.15, r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // 눈
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.35, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.4, -r * 0.35, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(-r * 0.36, -r * 0.35, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.44, -r * 0.35, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    // 손상 표시
    const dmg = 1 - Math.max(hp, 0) / maxHp;
    if (dmg > 0) {
      ctx.fillStyle = `rgba(120, 30, 30, ${(dmg * 0.35).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBird(x: number, y: number, r: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = BIRD.color;
    ctx.strokeStyle = BIRD.edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 부리
    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.15);
    ctx.lineTo(r * 1.35, 0);
    ctx.lineTo(r * 0.7, r * 0.25);
    ctx.closePath();
    ctx.fill();
    // 눈
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(r * 0.38, -r * 0.35, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** AIMING 중 패드 위 새(물리 바디 아님 — 발사 시 생성) */
  private drawGhostBird(): void {
    if (this.game.phase !== 'AIMING' || this.game.birdsLeft <= 0) return;
    this.drawBird(this.game.birdPos.x, this.game.birdPos.y, BIRD.r);
  }

  // ── 이펙트 (M22) ──

  private drawParticles(): void {
    const { ctx } = this;
    for (const p of this.game.effects.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(p.life / p.ttl, 0);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawPopups(): void {
    const { ctx } = this;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const p of this.game.effects.popups) {
      ctx.globalAlpha = Math.max(p.life / p.ttl, 0);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 4;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  // ── HUD — 점수·스테이지·대기 새. 일시정지 버튼은 DOM (M16) ──

  private drawHud(): void {
    const { ctx } = this;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 5;
    ctx.textAlign = 'left';
    ctx.strokeText(`점수 ${this.game.score}`, 20, 40);
    ctx.fillText(`점수 ${this.game.score}`, 20, 40);
    ctx.textAlign = 'center';
    ctx.strokeText(`스테이지 ${this.game.stageId}`, WORLD.width / 2, 40);
    ctx.fillText(`스테이지 ${this.game.stageId}`, WORLD.width / 2, 40);
    // 대기 중인 새 (패드 위 1마리 제외)
    const waiting = Math.max(0, this.game.birdsLeft - (this.game.phase === 'AIMING' ? 1 : 0));
    for (let i = 0; i < waiting; i++) {
      this.drawBird(46 + i * 30, WORLD.groundY - 12, 11);
    }
  }
}
