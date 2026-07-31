// 스테이지 로드·월드 구성·시도 수명주기·파괴·판정.
// 판정 규칙(플랜 5절): 클리어 = 돼지 0마리(짧은 연출 지연 후).
// 실패 = "시도 종료 이벤트 이후에만" — 마지막 새가 날아가는 동안에는 판정 유예.

import { createBlock, createPig, createBird } from './entities.js';
import {
  VW, GROUND_TOP, SLING, STEP_MS, DAMAGE, SCORE,
  REST_SPEED, REST_TIME_MS, OOB, CLEAR_DELAY_MS, PREROLL_STEPS,
} from '../constants.js';

const { Engine, Composite, Bodies, Vector } = Matter;

export class Stage {
  /**
   * @param engine Matter.Engine
   * @param cb { onClear(score, bonus), onFail() }
   */
  constructor(engine, cb) {
    this.engine = engine;
    this.cb = cb;
    this.def = null;
    this.score = 0;
    this.pigs = [];
    this.blocks = [];
    this.birdQueue = [];
    this.currentBird = null;
    this.restTimer = 0;
    this.particles = [];
    this.pendingClear = 0;
    this.finished = false;
    this.toRemove = new Set();

    Matter.Events.on(engine, 'collisionStart', (ev) => this.onCollision(ev));
  }

  /** StageDef로부터 월드를 (재)구성. "다시하기"도 같은 경로 — 완전 동일 초기 배치. */
  load(def) {
    this.def = def;
    this.score = 0;
    this.finished = false;
    this.pendingClear = 0;
    this.restTimer = 0;
    this.particles = [];
    this.toRemove.clear();
    this.currentBird = null;

    // 엔진 재생성 없이 월드만 리셋
    Composite.clear(this.engine.world, false);

    // 지면
    const ground = Bodies.rectangle(VW / 2, GROUND_TOP + 35, VW + 400, 70, {
      isStatic: true,
      friction: 0.8,
    });
    ground.plugin.ab = { kind: 'ground' };
    Composite.add(this.engine.world, ground);

    // 추가 플랫폼
    for (const p of def.platforms || []) {
      const body = Bodies.rectangle(p.x, p.y, p.w, p.h, { isStatic: true, friction: 0.8 });
      body.plugin.ab = { kind: 'platform', w: p.w, h: p.h };
      Composite.add(this.engine.world, body);
    }

    // 블록 / 돼지
    this.blocks = def.blocks.map(createBlock);
    this.pigs = def.pigs.map(createPig);
    Composite.add(this.engine.world, this.blocks);
    Composite.add(this.engine.world, this.pigs);

    // 새 큐
    this.birdQueue = def.birds.slice();

    // 안정화 프리롤: 스택 미세 진동을 가라앉힌 뒤 입력 허용
    for (let i = 0; i < PREROLL_STEPS; i++) Engine.update(this.engine, STEP_MS);

    this.loadNextBird();
  }

  loadNextBird() {
    if (this.birdQueue.length === 0) {
      this.currentBird = null;
      return;
    }
    this.birdQueue.shift();
    this.currentBird = createBird(SLING.x, SLING.y);
    Composite.add(this.engine.world, this.currentBird);
  }

  /** HUD 표시용: 아직 소모되지 않은 새 수(장전된 새 포함). */
  remainingBirds() {
    let n = this.birdQueue.length;
    if (this.currentBird && this.currentBird.plugin.ab.state !== 'flying') n += 1;
    return n;
  }

  /** 고정 스텝마다 Engine.update 직전에 호출. */
  update(dt) {
    // 파티클
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
    }

    if (this.finished) return;

    // 화면 밖으로 밀려난 돼지/블록 처리 (돼지는 제거로 간주)
    for (const pig of [...this.pigs]) {
      if (this.isOOB(pig.position)) this.killPig(pig);
    }
    for (const block of [...this.blocks]) {
      if (this.isOOB(block.position)) this.destroyBlock(block, false);
    }
    this.flushRemovals();

    // 시도 수명주기: 정지(속도 임계 이하 2초) 또는 화면 밖 이탈 시 종료
    const bird = this.currentBird;
    if (bird && bird.plugin.ab.state === 'flying') {
      if (this.isOOB(bird.position)) {
        this.endAttempt();
      } else {
        const speed = Vector.magnitude(bird.velocity);
        if (speed < REST_SPEED || bird.isSleeping) {
          this.restTimer += dt;
          if (this.restTimer >= REST_TIME_MS) this.endAttempt();
        } else {
          this.restTimer = 0;
        }
      }
    }

    // 클리어 연출 지연
    if (this.pendingClear > 0) {
      this.pendingClear -= dt;
      if (this.pendingClear <= 0) this.doClear();
    }
  }

  /** 시도 종료 — 실패 판정은 오직 이 지점에서만 수행한다. */
  endAttempt() {
    if (this.currentBird) {
      Composite.remove(this.engine.world, this.currentBird);
      this.currentBird = null;
    }
    this.restTimer = 0;

    if (this.finished || this.pendingClear > 0) return; // 클리어 경로가 처리 중
    if (this.pigs.length === 0) return;

    if (this.birdQueue.length === 0) {
      // 새 소진 & 돼지 잔존 → 실패
      this.finished = true;
      this.cb.onFail();
    } else {
      this.loadNextBird();
    }
  }

  /** 슬링샷이 발사 직후 호출. */
  onLaunched() {
    this.restTimer = 0;
  }

  // ---------- 충돌·파괴 ----------

  onCollision(ev) {
    if (this.finished || !this.def) return;
    for (const pair of ev.pairs) {
      const rel = Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity);
      const speed = Vector.magnitude(rel);
      if (speed < DAMAGE.minSpeed) continue;
      const dmg = (speed - DAMAGE.minSpeed) * DAMAGE.factor;
      this.applyDamage(pair.bodyA, dmg);
      this.applyDamage(pair.bodyB, dmg);
    }
    this.flushRemovals();
  }

  applyDamage(body, dmg) {
    const ab = body.plugin.ab;
    if (!ab) return;
    if (ab.kind !== 'block' && ab.kind !== 'pig') return; // 새·지면은 파괴 불가
    ab.hp -= dmg;
    if (ab.hp <= 0) {
      if (ab.kind === 'pig') this.killPig(body);
      else this.destroyBlock(body, true);
    }
  }

  killPig(pig) {
    if (!this.pigs.includes(pig)) return;
    this.pigs = this.pigs.filter((p) => p !== pig);
    this.toRemove.add(pig);
    this.score += SCORE.pig;
    this.spawnParticles(pig.position.x, pig.position.y, '#67c04d', 14);

    if (this.pigs.length === 0 && !this.finished && this.pendingClear <= 0) {
      this.pendingClear = CLEAR_DELAY_MS;
    }
  }

  destroyBlock(block, withScore) {
    if (!this.blocks.includes(block)) return;
    this.blocks = this.blocks.filter((b) => b !== block);
    this.toRemove.add(block);
    if (withScore) {
      this.score += SCORE.block;
      const m = block.plugin.ab.material;
      const color = m === 'ice' ? '#aadcf2' : m === 'stone' ? '#9aa0a6' : '#c98f4e';
      this.spawnParticles(block.position.x, block.position.y, color, 10);
    }
  }

  flushRemovals() {
    for (const body of this.toRemove) Composite.remove(this.engine.world, body);
    this.toRemove.clear();
  }

  doClear() {
    if (this.finished) return;
    this.finished = true;
    const remaining = this.remainingBirds();
    const bonus = remaining * SCORE.birdBonus;
    this.score += bonus;
    this.cb.onClear(this.score, bonus);
  }

  // ---------- 유틸 ----------

  isOOB(pos) {
    return pos.x < OOB.left || pos.x > OOB.right || pos.y > OOB.bottom;
  }

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2,
        life: 400 + Math.random() * 400,
        maxLife: 800,
        size: 3 + Math.random() * 5,
        color,
      });
    }
  }
}
