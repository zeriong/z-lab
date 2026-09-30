// level.js — 한 스테이지의 게임 로직: 생성, 피해, 파괴, 폭발, 새, 턴, 점수, 판정 (plan §6, §7, §8)
(function () {
  'use strict';
  const AB = (window.AB = window.AB || {});

  const PHASE = {
    READY: 'READY',
    AIMING: 'AIMING',
    FLYING: 'FLYING',
    NEXT_WAIT: 'NEXT_WAIT',
    FAIL_WAIT: 'FAIL_WAIT',
    CLEAR_WAIT: 'CLEAR_WAIT',
  };

  function isDestructible(b) {
    return (
      !b.isStatic && !b.dead && !b.removed &&
      (b.kind === 'block' || b.kind === 'tnt' || b.kind === 'pig')
    );
  }

  function isOutOfBounds(b) {
    const K = AB.CONFIG.KILL_BOUNDS;
    return b.pos.x < K.minX || b.pos.x > K.maxX || b.pos.y < K.minY;
  }

  function floorTo(v, step) {
    return Math.floor(v / step) * step;
  }

  function rand(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  class Level {
    constructor(stageIndex) {
      this.stageIndex = stageIndex;
      this.stage = AB.STAGES[stageIndex];
      this.world = new AB.Physics.World();
      this.pigs = [];
      this.blocks = [];
      this.pigsAlive = 0;
      this.birdQueue = [];
      this.slingBird = null;
      this.activeBirds = [];
      this.mainBird = null;
      this.abilityUsed = false;
      this.score = 0;
      this.phase = PHASE.READY;
      this.phaseTimer = 0;
      this.quietTimer = 0;
      this.time = 0;
      this.aimPos = null;
      this.pull = { x: 0, y: 0 };
      this.trail = [];
      this.trailTimer = 0;
      this.particles = [];
      this.popups = [];
      this.destroyQueue = [];
      this.explosionQueue = [];
      this.outcome = null;
      this.shotsFired = 0;
      this.starTwo = 0;
      this.starThree = 0;

      this._build();
      this.world.impactHandler = (A, B, approach, effMass) => this._onImpact(A, B, approach, effMass);
    }

    // ------------------------------------------------------------------
    // 생성 (§8.2)
    // ------------------------------------------------------------------
    _build() {
      const C = AB.CONFIG;
      const P = AB.Physics;
      const st = this.stage;

      const g = P.createBody({
        shape: 'box', x: C.GROUND.x, y: C.GROUND.y, hw: C.GROUND.hw, hh: C.GROUND.hh,
        isStatic: true, friction: C.GROUND_FRICTION, restitution: C.GROUND_RESTITUTION,
      });
      g.kind = 'ground';
      this.world.addBody(g);

      const statics = st.statics || [];
      for (let i = 0; i < statics.length; i++) {
        const s = statics[i];
        const rock = P.createBody({
          shape: 'box', x: s.x, y: s.b + s.h / 2, hw: s.w / 2, hh: s.h / 2,
          isStatic: true, friction: C.ROCK_FRICTION, restitution: C.ROCK_RESTITUTION,
        });
        rock.kind = 'rock';
        this.world.addBody(rock);
      }

      let blockScore = 0;
      const blocks = st.blocks || [];
      for (let i = 0; i < blocks.length; i++) {
        const d = blocks[i];
        const size = AB.BLOCK_SIZES[d.s];
        const matKey = d.s === 'TNT' ? 'tnt' : d.m;
        const mat = AB.MATERIALS[matKey];
        if (!size || !mat) continue;
        const body = P.createBody({
          shape: 'box', x: d.x, y: d.b + size.h / 2, hw: size.w / 2, hh: size.h / 2,
          density: mat.density, friction: mat.friction, restitution: mat.restitution,
          linDamp: C.BLOCK_LIN_DAMP, angDamp: C.BLOCK_ANG_DAMP,
        });
        body.kind = matKey === 'tnt' ? 'tnt' : 'block';
        body.material = matKey;
        const area = size.w * size.h;
        const hp = mat.fixedHp ? mat.baseHp : mat.baseHp * Math.max(C.BLOCK_HP_MIN_SCALE, area / C.BLOCK_HP_AREA_REF);
        body.hp = hp;
        body.maxHp = hp;
        body.dead = false;
        // 시작할 때 잠든 상태 → 누가 건드리기 전까지 구조물이 무너지지 않는다
        body.awake = false;
        body.sleepTime = C.TIME_TO_SLEEP;
        this.world.addBody(body);
        this.blocks.push(body);
        blockScore += mat.score;
      }

      const pigs = st.pigs || [];
      for (let i = 0; i < pigs.length; i++) {
        const d = pigs[i];
        const pt = AB.PIG_TYPES[d.s];
        if (!pt) continue;
        const body = P.createBody({
          shape: 'circle', x: d.x, y: d.b + pt.r, r: pt.r,
          density: pt.density, friction: pt.friction, restitution: pt.restitution,
          linDamp: pt.linDamp, angDamp: pt.angDamp,
        });
        body.kind = 'pig';
        body.pigType = d.s;
        body.king = !!d.king;
        body.hp = pt.hp;
        body.maxHp = pt.hp;
        body.dead = false;
        body.awake = false;
        body.sleepTime = C.TIME_TO_SLEEP;
        this.world.addBody(body);
        this.pigs.push(body);
      }
      this.pigsAlive = this.pigs.length;

      this.birdQueue = (st.birds || []).slice();
      this.slingBird = this.birdQueue.length > 0 ? this.birdQueue.shift() : null;
      this.phase = PHASE.READY;

      // 별 기준 (§6.5)
      const pigScore = this.pigs.length * C.SCORE_PIG;
      this.starTwo = floorTo(pigScore + C.STAR2.blockRatio * blockScore + C.STAR2.bonus, C.STAR_ROUND);
      this.starThree = floorTo(pigScore + C.STAR3.blockRatio * blockScore + C.STAR3.bonus, C.STAR_ROUND);
    }

    // ------------------------------------------------------------------
    // 고정 스텝 갱신 (§8.3)
    // ------------------------------------------------------------------
    update(dt) {
      if (this.outcome) return;
      this.time += dt;

      // 1. 물리
      this.world.step(dt);

      // 2. 안전망 제거분, 월드 경계, 파괴/폭발 큐
      this._handleLost();
      this._checkBounds();
      this._processQueues();

      // 3. 새
      this._updateBirds(dt);
      this._updateTrail(dt);

      // 4. 연출
      this._updateEffects(dt);

      // 5. 페이즈
      this._updatePhase(dt);
    }

    _handleLost() {
      const lost = this.world.takeLost();
      for (let i = 0; i < lost.length; i++) {
        const b = lost[i];
        if (b.kind === 'pig' && !b.dead) {
          this.pigsAlive = Math.max(0, this.pigsAlive - 1);
          this.score += AB.CONFIG.SCORE_PIG;
        }
        b.dead = true;
      }
    }

    // §6.4 월드 경계: 돼지는 처치(점수 포함), 블록은 점수 없이 제거. 새는 _updateBirds에서 처리
    _checkBounds() {
      const outBlocks = [];
      const bodies = this.world.bodies;
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (b.isStatic || b.removed || b.dead || b.kind === 'bird') continue;
        if (!isOutOfBounds(b)) continue;
        if (b.kind === 'pig') {
          b.dead = true;
          this.destroyQueue.push(b);
        } else {
          outBlocks.push(b);
        }
      }
      for (let i = 0; i < outBlocks.length; i++) {
        outBlocks[i].dead = true;
        this.world.removeBody(outBlocks[i]);
      }
    }

    // §6.2 파괴/폭발 연쇄. 재귀 없이 while 루프로 처리한다
    _processQueues() {
      while (this.destroyQueue.length > 0 || this.explosionQueue.length > 0) {
        while (this.destroyQueue.length > 0) {
          this._destroyBody(this.destroyQueue.shift());
        }
        if (this.explosionQueue.length > 0) {
          this._applyExplosion(this.explosionQueue.shift());
        }
      }
    }

    _destroyBody(b) {
      if (!b || b.removed) return;
      const C = AB.CONFIG;
      const FX = C.FX;
      const P = AB.Physics;
      b.dead = true;
      const wakeBox = P.computeAABB(b, C.WAKE_PAD);
      this.world.removeBody(b);

      // 주변 바디 깨우기
      const bodies = this.world.bodies;
      for (let i = 0; i < bodies.length; i++) {
        const o = bodies[i];
        if (o.isStatic || o.removed) continue;
        if (P.aabbOverlap(wakeBox, P.computeAABB(o, 0))) this.world.wakeBody(o);
      }

      if (b.kind === 'pig') {
        this.pigsAlive = Math.max(0, this.pigsAlive - 1);
        this._addScore(C.SCORE_PIG, b.pos.x, b.pos.y);
        this._spawnSmoke(b.pos.x, b.pos.y, AB.COLORS.PIG_SMOKE, FX.PIG_SMOKE_COUNT, b.r);
      } else {
        const mat = AB.MATERIALS[b.material];
        if (mat) {
          this._addScore(mat.score, b.pos.x, b.pos.y);
          this._spawnDebris(b.pos.x, b.pos.y, mat.fill, mat.stroke, FX.DEBRIS_COUNT, FX.DEBRIS_SPEED);
        }
        if (b.kind === 'tnt') {
          this.explosionQueue.push({ x: b.pos.x, y: b.pos.y, spec: C.TNT_EXPLOSION });
        }
      }
    }

    // §6.3 폭발
    _applyExplosion(e) {
      const C = AB.CONFIG;
      const FX = C.FX;
      const spec = e.spec;
      const R = spec.R;
      const bodies = this.world.bodies;
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (b.isStatic || b.removed) continue;
        const dx = b.pos.x - e.x;
        const dy = b.pos.y - e.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= R) continue;
        const f = 1 - d / R;
        const dir = AB.V.normalize({ x: dx, y: dy }, { x: 0, y: 1 });
        this.world.wakeBody(b);
        const dv = spec.J * f * b.invMass;
        b.vel.x += dir.x * dv;
        b.vel.y += dir.y * dv;
        b.av += -Math.sign(dir.x) * C.EXPLOSION_SPIN * f;
        // 새에는 충격량만 준다
        if (b.kind !== 'bird' && isDestructible(b)) {
          b.hp -= spec.D * f;
          if (b.hp <= 0) {
            b.dead = true;
            this.destroyQueue.push(b);
          }
        }
      }
      this.particles.push({
        type: 'ring', x: e.x, y: e.y, R: R, life: FX.RING_TIME, maxLife: FX.RING_TIME,
      });
      const half = Math.floor(FX.EXPLOSION_DEBRIS / 2);
      this._spawnDebris(e.x, e.y, AB.COLORS.EXPLOSION_A, null, half, FX.EXPLOSION_DEBRIS_SPEED);
      this._spawnDebris(e.x, e.y, AB.COLORS.EXPLOSION_B, null, FX.EXPLOSION_DEBRIS - half, FX.EXPLOSION_DEBRIS_SPEED);
    }

    // ------------------------------------------------------------------
    // 충돌 피해 (§6.1) — 물리 스텝 안에서 호출된다. 바디를 삭제하지 않는다
    // ------------------------------------------------------------------
    _onImpact(A, B, approach, effMass) {
      const C = AB.CONFIG;
      if (A.dead || B.dead) return true;
      if (approach < C.DAMAGE_MIN_SPEED) return false;
      const dmg = C.DAMAGE_K * effMass * (approach - C.DAMAGE_MIN_SPEED);
      const brokeA = this._damage(A, B, dmg);
      const brokeB = this._damage(B, A, dmg);
      if (!brokeA && !brokeB) return false;
      // 뚫고 지나감: 살아 있는 상대 동적 바디 감속
      if (!A.dead && !A.isStatic) {
        A.vel.x *= C.BREAK_SLOWDOWN;
        A.vel.y *= C.BREAK_SLOWDOWN;
      }
      if (!B.dead && !B.isStatic) {
        B.vel.x *= C.BREAK_SLOWDOWN;
        B.vel.y *= C.BREAK_SLOWDOWN;
      }
      return true;
    }

    // X가 O와 부딪혀 dmg 피해를 받는다. 이번 호출로 파괴되면 true
    _damage(X, O, dmg) {
      const C = AB.CONFIG;
      if (!isDestructible(X)) return false;
      let mult = 1;
      if (O.kind === 'bird') {
        const table = AB.BIRD_MULT[O.birdType];
        const key = X.kind === 'pig' ? 'pig' : X.material;
        if (table && typeof table[key] === 'number') mult = table[key];
      }
      const d = dmg * mult;
      if (d < C.MIN_DAMAGE) return false;
      X.hp -= d;
      if (X.hp <= 0) {
        X.dead = true;
        this.destroyQueue.push(X);
        return true;
      }
      return false;
    }

    // ------------------------------------------------------------------
    // 새 (§5.4, §8.3-3)
    // ------------------------------------------------------------------
    _createBirdBody(type, x, y, vx, vy) {
      const C = AB.CONFIG;
      const bt = AB.BIRD_TYPES[type];
      const b = AB.Physics.createBody({
        shape: 'circle', x: x, y: y, r: bt.r, density: bt.density,
        friction: C.BIRD_FRICTION, restitution: C.BIRD_RESTITUTION,
        linDamp: 0, angDamp: 0, group: C.BIRD_GROUP,
      });
      b.kind = 'bird';
      b.birdType = type;
      b.vel.x = vx;
      b.vel.y = vy;
      b.awake = true;
      b.sleepTime = 0;
      b.hasCollided = false;
      b.age = 0;
      b.restTimer = 0;
      b.fuse = -1;
      b.exploded = false;
      b.boosted = false;
      this.world.addBody(b);
      this.activeBirds.push(b);
      return b;
    }

    _updateBirds(dt) {
      const C = AB.CONFIG;
      const keep = [];
      const list = this.activeBirds;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        let remove = false;
        if (b.removed) {
          remove = true;
        } else {
          b.age += dt;
          if (!b.hasCollided && b.contactCount > 0) {
            b.hasCollided = true;
            b.linDamp = C.BIRD_ROLL_LIN_DAMP;
            b.angDamp = C.BIRD_ROLL_ANG_DAMP;
            if (b.birdType === 'black' && b.fuse < 0) b.fuse = C.BLACK_FUSE;
          }
          if (b.birdType === 'black' && b.fuse > 0) {
            b.fuse -= dt;
            if (b.fuse <= 0) {
              b.fuse = 0;
              this._explodeBird(b);
              remove = true;
            }
          }
          if (!remove && isOutOfBounds(b)) remove = true;
          if (!remove && b.hasCollided) {
            const slow =
              b.vel.x * b.vel.x + b.vel.y * b.vel.y < C.BIRD_REST_SPEED * C.BIRD_REST_SPEED &&
              Math.abs(b.av) < C.BIRD_REST_ANG;
            if (!b.awake || slow) b.restTimer += dt;
            else b.restTimer = 0;
            if (!b.awake || b.restTimer >= C.BIRD_REST_TIME) remove = true;
          }
          if (!remove && b.age >= C.BIRD_MAX_LIFETIME) remove = true;
        }
        if (remove) {
          if (!b.removed) {
            this._spawnSmoke(b.pos.x, b.pos.y, AB.COLORS.BIRD_SMOKE, C.FX.BIRD_SMOKE_COUNT, b.r);
            this.world.removeBody(b);
          }
        } else {
          keep.push(b);
        }
      }
      this.activeBirds = keep;
    }

    // §7.4 주 새 궤적 기록
    _updateTrail(dt) {
      const C = AB.CONFIG;
      const b = this.mainBird;
      if (this.phase !== PHASE.FLYING || !b || b.removed) return;
      this.trailTimer += dt;
      if (this.trailTimer >= C.TRAIL_INTERVAL) {
        this.trailTimer -= C.TRAIL_INTERVAL;
        if (this.trail.length < C.TRAIL_MAX) this.trail.push({ x: b.pos.x, y: b.pos.y });
      }
    }

    _explodeBird(b) {
      if (!b || b.exploded || b.removed) return;
      b.exploded = true;
      const x = b.pos.x;
      const y = b.pos.y;
      this.world.removeBody(b);
      this.explosionQueue.push({ x: x, y: y, spec: AB.CONFIG.BLACK_EXPLOSION });
      this._processQueues();
    }

    // §7.5 능력 발동 (턴당 1회)
    activateAbility() {
      const C = AB.CONFIG;
      if (this.outcome || this.phase !== PHASE.FLYING || this.abilityUsed) return false;
      const b = this.mainBird;
      if (!b || b.removed) return false;
      const type = AB.BIRD_TYPES[b.birdType];
      if (!type || !type.ability) return false;

      if (type.ability === 'split') {
        if (b.hasCollided) return false;
        const perp = AB.V.normalize({ x: -b.vel.y, y: b.vel.x }, { x: 0, y: 1 });
        const signs = [1, -1];
        for (let i = 0; i < signs.length; i++) {
          const sgn = signs[i];
          const v = AB.V.rotate(b.vel, sgn * C.BLUE_SPLIT_ANGLE);
          const nb = this._createBirdBody(
            b.birdType,
            b.pos.x + perp.x * sgn * C.BLUE_SPLIT_OFFSET,
            b.pos.y + perp.y * sgn * C.BLUE_SPLIT_OFFSET,
            v.x, v.y
          );
          nb.age = b.age;
        }
      } else if (type.ability === 'boost') {
        if (b.hasCollided) return false;
        const dir = AB.V.normalize(b.vel, { x: 1, y: 0 });
        b.vel.x = dir.x * C.YELLOW_BOOST_SPEED;
        b.vel.y = dir.y * C.YELLOW_BOOST_SPEED;
        b.boosted = true;
      } else if (type.ability === 'explode') {
        this._explodeBird(b);
      } else {
        return false;
      }
      this.abilityUsed = true;
      return true;
    }

    // ------------------------------------------------------------------
    // 슬링샷 (§7)
    // ------------------------------------------------------------------
    // 조준을 시작하면 true (Input이 포인터 캡처를 건다)
    pointerDown(wx, wy) {
      const C = AB.CONFIG;
      if (this.outcome) return false;
      if (this.phase === PHASE.READY && this.slingBird) {
        const a = C.SLING_ANCHOR;
        const dx = wx - a.x;
        const dy = wy - a.y;
        if (dx * dx + dy * dy <= C.GRAB_RADIUS * C.GRAB_RADIUS) {
          this.phase = PHASE.AIMING;
          this._setAim(wx, wy);
          return true;
        }
        return false;
      }
      if (this.phase === PHASE.FLYING) {
        this.activateAbility();
      }
      return false;
    }

    pointerMove(wx, wy) {
      if (this.phase !== PHASE.AIMING) return;
      this._setAim(wx, wy);
    }

    pointerUp(wx, wy) {
      const C = AB.CONFIG;
      if (this.phase !== PHASE.AIMING) return;
      if (Number.isFinite(wx) && Number.isFinite(wy)) this._setAim(wx, wy);
      const len = Math.sqrt(this.pull.x * this.pull.x + this.pull.y * this.pull.y);
      if (len < C.MIN_PULL) {
        this.cancelAim();
        return;
      }
      this._launch();
    }

    pointerCancel() {
      this.cancelAim();
    }

    cancelAim() {
      if (this.phase === PHASE.AIMING) this.phase = PHASE.READY;
      this.aimPos = null;
      this.pull = { x: 0, y: 0 };
    }

    _setAim(wx, wy) {
      const C = AB.CONFIG;
      const a = C.SLING_ANCHOR;
      let px = wx - a.x;
      let py = wy - a.y;
      const len = Math.sqrt(px * px + py * py);
      if (len > C.MAX_PULL) {
        px *= C.MAX_PULL / len;
        py *= C.MAX_PULL / len;
      }
      const bt = AB.BIRD_TYPES[this.slingBird];
      const minY = (bt ? bt.r : 0) + C.SLING_GROUND_PAD;
      const bx = a.x + px;
      let by = a.y + py;
      if (by < minY) by = minY;
      this.aimPos = { x: bx, y: by };
      this.pull = { x: bx - a.x, y: by - a.y };
    }

    _launchVelocity() {
      const C = AB.CONFIG;
      const k = C.MAX_LAUNCH_SPEED / C.MAX_PULL;
      return { x: -this.pull.x * k, y: -this.pull.y * k };
    }

    _launch() {
      const type = this.slingBird;
      if (!type || !this.aimPos) {
        this.cancelAim();
        return;
      }
      const v = this._launchVelocity();
      const b = this._createBirdBody(type, this.aimPos.x, this.aimPos.y, v.x, v.y);
      this.mainBird = b;
      this.slingBird = null;
      this.abilityUsed = false;
      this.aimPos = null;
      this.pull = { x: 0, y: 0 };
      this.trail = [{ x: b.pos.x, y: b.pos.y }];
      this.trailTimer = 0;
      this.shotsFired++;
      this.phase = PHASE.FLYING;
      this.phaseTimer = 0;
    }

    // §7.3 예측 궤적 — 물리와 같은 적분 순서 (속도 먼저, 위치 나중), 비행 중 감쇠 0
    getPreviewPoints() {
      const C = AB.CONFIG;
      if (this.phase !== PHASE.AIMING || !this.aimPos) return [];
      const dt = C.FIXED_DT;
      const v = this._launchVelocity();
      let px = this.aimPos.x;
      let py = this.aimPos.y;
      let vx = v.x;
      let vy = v.y;
      const steps = Math.round(C.PREVIEW_TIME / dt);
      const pts = [];
      for (let i = 1; i <= steps; i++) {
        vy += C.GRAVITY * dt;
        px += vx * dt;
        py += vy * dt;
        if (py < 0 || px > C.WORLD_MAX_X) break;
        if (i % C.PREVIEW_SAMPLE === 0) pts.push({ x: px, y: py });
      }
      return pts;
    }

    // 슬링 위 새의 위치 (렌더용)
    getSlingBirdPos() {
      if (!this.slingBird) return null;
      if (this.phase === PHASE.AIMING && this.aimPos) return this.aimPos;
      return AB.CONFIG.SLING_ANCHOR;
    }

    getSlingBirdAngle() {
      if (this.phase === PHASE.AIMING && this.aimPos) {
        const len = Math.sqrt(this.pull.x * this.pull.x + this.pull.y * this.pull.y);
        if (len >= AB.CONFIG.EPSILON) return Math.atan2(-this.pull.y, -this.pull.x);
      }
      return 0;
    }

    // ------------------------------------------------------------------
    // 페이즈 (§8.3-5)
    // ------------------------------------------------------------------
    _updatePhase(dt) {
      const C = AB.CONFIG;
      if (this.outcome) return;
      if (this.pigsAlive <= 0 && this.phase !== PHASE.CLEAR_WAIT) {
        this.cancelAim();
        this.phase = PHASE.CLEAR_WAIT;
        this.phaseTimer = 0;
        return;
      }
      this.phaseTimer += dt;
      switch (this.phase) {
        case PHASE.FLYING:
          if (this.activeBirds.length === 0) {
            if (this.birdQueue.length > 0) {
              this.phase = PHASE.NEXT_WAIT;
            } else {
              this.phase = PHASE.FAIL_WAIT;
              this.quietTimer = 0;
            }
            this.phaseTimer = 0;
          }
          break;
        case PHASE.NEXT_WAIT:
          if (this.phaseTimer >= C.NEXT_BIRD_DELAY) {
            this.slingBird = this.birdQueue.length > 0 ? this.birdQueue.shift() : null;
            this.phase = this.slingBird ? PHASE.READY : PHASE.FAIL_WAIT;
            this.phaseTimer = 0;
            this.quietTimer = 0;
          }
          break;
        case PHASE.FAIL_WAIT:
          if (this.world.isQuiet(C.QUIET_SPEED, C.QUIET_ANG)) this.quietTimer += dt;
          else this.quietTimer = 0;
          if (this.quietTimer >= C.FAIL_QUIET_TIME || this.phaseTimer >= C.FAIL_MAX_WAIT) {
            this.outcome = { cleared: false, score: this.score, bonus: 0, stars: 0, newBest: false };
          }
          break;
        case PHASE.CLEAR_WAIT:
          if (this.phaseTimer >= C.CLEAR_DELAY) {
            const left = this.birdQueue.length + (this.slingBird ? 1 : 0);
            const bonus = left * C.SCORE_BIRD_LEFT;
            this.score += bonus;
            this.outcome = {
              cleared: true,
              score: this.score,
              bonus: bonus,
              stars: this._calcStars(this.score),
              newBest: false,
            };
          }
          break;
        default:
          break;
      }
    }

    _calcStars(score) {
      if (score >= this.starThree) return 3;
      if (score >= this.starTwo) return 2;
      return 1;
    }

    // §9.4 안내 문구
    getHint() {
      if ((this.phase === PHASE.READY || this.phase === PHASE.AIMING) && this.slingBird) {
        if (this.stageIndex === 0 && this.shotsFired === 0) return AB.CONFIG.HINT_FIRST_SHOT;
        const bt = AB.BIRD_TYPES[this.slingBird];
        if (bt && bt.hint) return bt.hint;
      }
      return '';
    }

    // ------------------------------------------------------------------
    // 연출 (파티클·팝업)
    // ------------------------------------------------------------------
    _addScore(points, x, y) {
      const FX = AB.CONFIG.FX;
      this.score += points;
      this.popups.push({
        x: x, y: y, text: AB.Util.formatNumber(points), life: FX.POPUP_TIME, maxLife: FX.POPUP_TIME,
      });
    }

    _spawnDebris(x, y, color, edge, count, speed) {
      const FX = AB.CONFIG.FX;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = speed * rand(0.4, 1);
        this.particles.push({
          type: 'debris',
          x: x + rand(-0.2, 0.2),
          y: y + rand(-0.2, 0.2),
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp + speed * 0.5,
          rot: Math.random() * Math.PI,
          vr: rand(-FX.DEBRIS_SPIN, FX.DEBRIS_SPIN),
          size: rand(FX.DEBRIS_SIZE_MIN, FX.DEBRIS_SIZE_MAX),
          color: color,
          edge: edge,
          life: FX.DEBRIS_LIFE * rand(0.7, 1),
          maxLife: FX.DEBRIS_LIFE,
        });
      }
    }

    _spawnSmoke(x, y, color, count, radius) {
      const FX = AB.CONFIG.FX;
      for (let i = 0; i < count; i++) {
        const ang = (i / Math.max(1, count)) * Math.PI * 2 + rand(-0.3, 0.3);
        const sp = FX.SMOKE_SPEED * rand(0.5, 1);
        this.particles.push({
          type: 'smoke',
          x: x + Math.cos(ang) * radius * 0.5,
          y: y + Math.sin(ang) * radius * 0.5,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp + FX.SMOKE_RISE,
          r: radius * rand(0.5, 0.8),
          color: color,
          life: FX.SMOKE_LIFE * rand(0.8, 1),
          maxLife: FX.SMOKE_LIFE,
        });
      }
    }

    _updateEffects(dt) {
      const C = AB.CONFIG;
      const FX = C.FX;
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.type === 'debris') {
          p.vy += C.GRAVITY * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
        } else if (p.type === 'smoke') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.r += FX.SMOKE_GROW * p.r * dt;
        }
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (let i = 0; i < this.popups.length; i++) this.popups[i].life -= dt;
      this.popups = this.popups.filter((p) => p.life > 0);
    }
  }

  Level.PHASE = PHASE;
  AB.Level = Level;
})();
