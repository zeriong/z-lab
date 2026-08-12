// PLAYING 세션 소유자 — 엔진 생성/해체, 스테이지 구성, 충돌·파괴, 턴 종료, 클리어/실패 판정 (§2.2, §3).
// PAUSED 여부는 main.js 상태 머신이 결정하며, 이 클래스는 update() 호출을 받지 않을 뿐이다 (§2.2 원칙).
// 타이머류는 전부 시뮬레이션 시간(simTime) 기준 — 일시정지 시 경과 누적이 자동으로 멈춘다 (§5.2).

import {
  createEngine,
  createGround,
  createStaticBlock,
  createBlock,
  createPig,
  createBird,
  WIDTH,
  HEIGHT,
} from './physics.js';
import { computeDamage, isDestructible, specOf, BONUS_PER_BIRD } from './entities.js';
import { Slingshot } from './slingshot.js';

const { Engine, Events, Composite, World } = window.Matter;

const STABILIZE_MS = 500; // 스테이지 시작 직후 판정 무시(적층 안정화) (§6 리스크 대비)
const TURN_TIMEOUT_MS = 5000; // 발사 후 타임아웃 (§3.6-2)
const CALM_MS = 1000; // 전체 정지 연속 유지 시간 (§3.6-1)
const CALM_SPEED = 0.2; // 정지 판정 속도 임계
const CALM_ANGULAR = 0.05;
const CLEAR_DELAY_MS = 1000; // 마지막 돼지 제거 후 여유 (§3.7)
const OOB_MARGIN = 150; // 월드 경계 밖 판정 여유

export class Game {
  // hooks: { isPlaying(), onHUD(data), onFinish({clear, score}) }
  constructor(canvas, stage, hooks) {
    this.stage = stage;
    this.hooks = hooks;

    this.simTime = 0;
    this.score = 0;
    this.birdsLeft = stage.birds; // 아직 발사하지 않은 새 수(장전된 새 포함)
    this.pigsLeft = stage.pigs.length;
    this.particles = [];

    this.activeBird = null;
    this.turnActive = false;
    this.launchTime = 0;
    this.calmSince = null;
    this.clearAt = null;
    this.finished = false;

    this.engine = createEngine();
    this.world = this.engine.world;

    // 월드 구성 — 재시작/다음 스테이지 모두 "해체 후 구성" 동일 경로 (§4.1)
    Composite.add(this.world, createGround());
    for (const s of stage.statics || []) Composite.add(this.world, createStaticBlock(s));
    for (const b of stage.blocks) Composite.add(this.world, createBlock(b));
    for (const p of stage.pigs) Composite.add(this.world, createPig(p));

    this.slingshot = new Slingshot(canvas, stage.slingshot, {
      isActive: () => this.hooks.isPlaying() && !this.finished,
      onLaunch: (bird) => this.handleLaunch(bird),
    });

    this._onCollision = (event) => this.handleCollision(event);
    Events.on(this.engine, 'collisionStart', this._onCollision);

    this.loadBird();
    this.pushHUD();
  }

  destroy() {
    Events.off(this.engine);
    this.slingshot.destroy();
    World.clear(this.world, false);
    Engine.clear(this.engine);
  }

  // ---------- 장전 / 발사 ----------

  loadBird() {
    if (this.birdsLeft <= 0) return;
    const bird = createBird(this.stage.slingshot.x, this.stage.slingshot.y);
    Composite.add(this.world, bird);
    this.slingshot.load(bird);
  }

  handleLaunch(bird) {
    this.birdsLeft -= 1;
    this.activeBird = bird;
    this.turnActive = true;
    this.launchTime = this.simTime;
    this.calmSince = null;
    this.pushHUD();
  }

  // ---------- 충돌 · 파괴 (§3.4) ----------

  handleCollision(event) {
    if (this.simTime < STABILIZE_MS || this.finished) return;
    for (const pair of event.pairs) {
      const n = pair.collision.normal;
      const rvx = pair.bodyA.velocity.x - pair.bodyB.velocity.x;
      const rvy = pair.bodyA.velocity.y - pair.bodyB.velocity.y;
      const impact = Math.abs(rvx * n.x + rvy * n.y); // 상대속도의 법선 성분

      for (const body of [pair.bodyA, pair.bodyB]) {
        const data = body.gameData;
        if (!isDestructible(data) || data.dead) continue;
        const dmg = computeDamage(data, impact);
        if (dmg > 0) {
          data.hp -= dmg;
          if (data.hp <= 0) this.destroyBody(body);
        }
      }
    }
  }

  destroyBody(body) {
    const data = body.gameData;
    if (data.dead) return;
    data.dead = true;
    Composite.remove(this.world, body);

    const spec = specOf(data);
    if (spec) {
      this.score += spec.score;
      this.spawnParticles(body.position.x, body.position.y, spec.color);
    }
    if (data.kind === 'pig') {
      this.pigsLeft -= 1;
      if (this.pigsLeft <= 0 && this.clearAt === null) {
        this.clearAt = this.simTime + CLEAR_DELAY_MS; // 즉시 판정 + 1초 여유 (§3.7)
      }
    }
    this.pushHUD();
  }

  // ---------- 프레임 갱신 ----------

  update(dt) {
    this.simTime += dt;
    Engine.update(this.engine, dt);
    this.sweepOutOfBounds();
    this.updateParticles(dt);

    if (this.finished) return;

    if (this.clearAt !== null) {
      if (this.simTime >= this.clearAt) this.finish(true);
      return;
    }

    if (this.turnActive) {
      // §3.6: (3) 새 이탈 → (2) 타임아웃 → (1) 전체 정지 1초
      if (!this.activeBird || this.activeBird.gameData.dead) {
        this.endTurn();
      } else if (this.simTime - this.launchTime >= TURN_TIMEOUT_MS) {
        this.endTurn();
      } else if (this.allCalm()) {
        if (this.calmSince === null) this.calmSince = this.simTime;
        else if (this.simTime - this.calmSince >= CALM_MS) this.endTurn();
      } else {
        this.calmSince = null;
      }
    }
  }

  allCalm() {
    return Composite.allBodies(this.world).every(
      (b) =>
        b.isStatic || (b.speed < CALM_SPEED && Math.abs(b.angularVelocity) < CALM_ANGULAR)
    );
  }

  sweepOutOfBounds() {
    for (const body of Composite.allBodies(this.world)) {
      if (body.isStatic) continue;
      const { x, y } = body.position;
      if (x < -OOB_MARGIN || x > WIDTH + OOB_MARGIN || y > HEIGHT + OOB_MARGIN) {
        const data = body.gameData || {};
        if (isDestructible(data)) {
          // 돼지가 밖으로 굴러떨어져도 제거로 인정 (§3.4)
          this.destroyBody(body);
        } else if (!data.dead) {
          data.dead = true;
          Composite.remove(this.world, body);
        }
      }
    }
  }

  // ---------- 턴 종료 · 판정 (§3.6, §3.7) ----------

  endTurn() {
    this.turnActive = false;
    this.calmSince = null;
    if (this.activeBird && !this.activeBird.gameData.dead) {
      this.activeBird.gameData.dead = true;
      const { x, y } = this.activeBird.position;
      Composite.remove(this.world, this.activeBird);
      this.spawnParticles(x, y, '#eeeeee');
    }
    this.activeBird = null;

    if (this.clearAt !== null || this.finished) return;
    // 실패 판정은 반드시 턴 종료 후 (§3.7 순서 주의)
    if (this.pigsLeft > 0) {
      if (this.birdsLeft > 0) this.loadBird();
      else this.finish(false);
    }
  }

  finish(clear) {
    if (this.finished) return;
    this.finished = true;
    if (clear) this.score += this.birdsLeft * BONUS_PER_BIRD; // 남은 새 보너스 (§3.5)
    this.pushHUD();
    this.hooks.onFinish({ clear, score: this.score });
  }

  // ---------- 파편 파티클(물리 없는 장식, 1초 소멸) (§3.4) ----------

  spawnParticles(x, y, color) {
    const count = 4 + Math.floor(Math.random() * 3); // 4~6개
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 5 - 1,
        size: 4 + Math.random() * 5,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        life: 1000,
        color,
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 0.25;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---------- HUD ----------

  pushHUD() {
    this.hooks.onHUD({
      stage: this.stage.id,
      name: this.stage.name,
      score: this.score,
      birds: this.birdsLeft,
      pigs: this.pigsLeft,
    });
  }
}
