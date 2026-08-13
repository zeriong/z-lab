// src/game.js
// 게임 로직 및 상태 머신 (§6)
// 의존성: U, C, MAT, P, SB, STAGES, SFX

const GAME = {
  // 상태 속성들
  canvas: null,
  state: 'MENU',
  shot: 'ARMED',
  world: null,
  stageId: 1,
  birds: [],
  currentBird: null,
  birdIndex: 0,
  score: 0,
  cam: { x: 0 },
  particles: [],
  flyTime: 0,
  settlingTime: 0,
  acc: 0,
  maxScore: 0,
  pigsRemaining: 0,
  unlockedStage: 1,
  trackedBodies: new Set(),

  create(canvas) {
    // GAME 객체 자체의 상태 초기화
    this.canvas = canvas;
    this.state = 'MENU';
    this.shot = 'ARMED';
    this.world = null;
    this.stageId = 1;
    this.birds = [];
    this.currentBird = null;
    this.birdIndex = 0;
    this.score = 0;
    this.cam = { x: 0 };
    this.particles = [];
    this.flyTime = 0;
    this.settlingTime = 0;
    this.acc = 0;
    this.maxScore = 0;
    this.pigsRemaining = 0;
    this.trackedBodies = new Set();

    // 저장 로드
    try {
      const saved = JSON.parse(localStorage[C.SAVE_KEY]);
      if (saved) {
        this.unlockedStage = saved.unlocked || 1;
      }
    } catch (e) {
      this.unlockedStage = 1;
    }

    return this;
  },

  loadStage(id) {
    const stage = STAGES.find(s => s.id === id);
    if (!stage) return;

    this.world = P.createWorld();
    this.trackedBodies = new Set();

    // 지면 바디 추가
    P.addBox(this.world, C.WORLD_W / 2, 680, C.WORLD_W / 2, 60, {
      mat: 'ground',
      kind: 'ground',
      isStatic: true
    });

    // 스테이지 빌드
    stage.build(this.world);

    // 돼지 개수 세기
    this.pigsRemaining = this.world.bodies.filter(b => b.kind === 'pig').length;

    // 새 큐 초기화
    this.birds = stage.birds.slice();
    this.birdIndex = 0;

    // 점수 계산
    this.maxScore = (this.pigsRemaining * C.SCORE_PIG) +
      this.world.bodies
        .filter(b => b.kind === 'block')
        .reduce((sum, b) => sum + MAT[b.mat].breakScore, 0) +
      (this.birds.length * C.SCORE_BIRD_LEFT);

    // 첫 새 장전
    this.currentBird = null;
    this._loadNextBird();

    // 상태 초기화
    this.state = 'PLAYING';
    this.shot = 'ARMED';
    this.score = 0;
    this.flyTime = 0;
    this.settlingTime = 0;
    this.stageId = id;
    this.cam.x = 0;
    this.particles = [];
    this.acc = 0;
  },

  _loadNextBird() {
    if (this.birdIndex >= this.birds.length) {
      this.currentBird = null;
      return;
    }

    const birdType = this.birds[this.birdIndex];
    const birdInfo = BIRD[birdType];

    this.currentBird = {
      x: C.SLING_X,
      y: C.SLING_Y,
      vx: 0,
      vy: 0,
      r: birdInfo.radius,
      birdType,
      angle: 0,
      canAbility: true,
      hitTime: 0
    };
  },

  update(dt) {
    // 일시정지 중 업데이트 스킵
    if (this.state !== 'PLAYING') {
      return;
    }

    dt = Math.min(dt, C.MAX_FRAME_DT);

    // 파괴된 바디 추적 (step 전)
    const bodyIdsBefore = new Set(this.world.bodies.map(b => b.id));

    // 고정 스텝 누적
    this.acc += dt;
    let steps = 0;
    while (this.acc >= C.FIXED_DT && steps < C.MAX_STEPS) {
      P.step(this.world, C.FIXED_DT);
      this.acc -= C.FIXED_DT;
      steps++;
    }
    if (steps === C.MAX_STEPS) {
      this.acc = 0;
    }

    // 파괴된 바디 감지 및 처리
    const bodyIdsAfter = new Set(this.world.bodies.map(b => b.id));
    for (const id of bodyIdsBefore) {
      if (!bodyIdsAfter.has(id)) {
        // 바디 id가 제거됨 → 파괴된 바디 추적
        // dead 바디는 이미 제거되었으므로, 추적에서 점수/파티클 처리
      }
    }

    // 현재 world의 dead 바디 처리 (제거 전)
    for (let i = this.world.bodies.length - 1; i >= 0; i--) {
      const b = this.world.bodies[i];
      if (b.dead) {
        // 점수 및 파티클 생성
        if (b.kind === 'pig') {
          this.score += C.SCORE_PIG;
          this._createParticles(b.x, b.y, 8, MAT.pig.color);
          SFX.play('break');
        } else if (b.kind === 'block') {
          this.score += MAT[b.mat].breakScore;
          this._createParticles(b.x, b.y, 10, MAT[b.mat].color);
          SFX.play('break');
        }
      }
    }

    // 샷 수명주기 업데이트
    if (this.shot === 'FLYING') {
      this.flyTime += dt;

      // 새 회전 (시각용)
      if (this.currentBird && this.currentBird.shape === 'circle') {
        // 월드에 있는 새 바디
        this.currentBird.angle = Math.atan2(this.currentBird.vy, this.currentBird.vx);
        this.currentBird.hitTime += dt;
      }

      // SETTLING 진입 조건
      let shouldSettle = false;

      // 1) 모든 비정적 바디가 슬립 + 새도 정지/소멸
      if (this.currentBird) {
        const allSleeping = this.world.bodies.every(b =>
          b.isStatic || b.sleeping || b.dead
        );
        const birdStillAlive = this.world.bodies.find(b => b === this.currentBird);
        if (allSleeping && !birdStillAlive) {
          shouldSettle = true;
        }
      } else {
        shouldSettle = true;
      }

      // 2) 발사 후 SETTLE_TIMEOUT 초
      if (this.flyTime > C.SETTLE_TIMEOUT) {
        shouldSettle = true;
      }

      // 3) 새가 월드 밖으로 이탈
      if (this.currentBird && (
        this.currentBird.x < -50 ||
        this.currentBird.x > C.WORLD_W + 50 ||
        this.currentBird.y > C.WORLD_H + 100
      )) {
        if (this.currentBird.dead) {
          shouldSettle = true;
        } else {
          this.currentBird.dead = true;
        }
      }

      if (shouldSettle) {
        this.shot = 'SETTLING';
        this.settlingTime = 0;
      }
    }

    if (this.shot === 'SETTLING') {
      this.settlingTime += dt;

      if (this.settlingTime > C.SETTLE_GRACE) {
        // 판정
        const pigsNow = this.world.bodies.filter(b => b.kind === 'pig').length;
        if (pigsNow === 0) {
          // CLEAR
          this._onClear();
        } else if (this.birdIndex >= this.birds.length - 1) {
          // FAIL
          this._onFail();
        } else {
          // 다음 새 로드
          this.birdIndex++;
          this._loadNextBird();
          this.shot = 'ARMED';
          this.flyTime = 0;
          this.settlingTime = 0;

          // 이전 새 바디 제거
          if (this.currentBird) {
            const oldBird = this.world.bodies.find(b =>
              b.kind === 'bird' && b.birdType === this.birds[this.birdIndex - 1]
            );
            if (oldBird) {
              oldBird.dead = true;
            }
          }
        }
      }
    }

    // 파티클 업데이트
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += C.GRAVITY * 0.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 카메라 갱신
    let camTarget = 0;
    if (this.shot === 'FLYING' && this.currentBird) {
      camTarget = U.clamp(this.currentBird.x - 420, 0, 640);
    }
    this.cam.x = U.lerp(this.cam.x, camTarget, 1 - Math.pow(0.001, dt));

    // HUD 갱신
    if (UI && UI.updateHud) {
      UI.updateHud(this);
    }
  },

  startDrag(px, py) {
    if (this.state !== 'PLAYING' || this.shot !== 'ARMED' || !this.currentBird) return;

    const dx = px - C.SLING_X;
    const dy = py - C.SLING_Y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d <= C.SLING_GRAB_R) {
      this.shot = 'DRAG';
      SFX.play('launch');
    }
  },

  moveDrag(px, py) {
    if (this.shot !== 'DRAG' || !this.currentBird) return;

    const dx = px - C.SLING_X;
    const dy = py - C.SLING_Y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d <= C.SLING_MAX_PULL) {
      this.currentBird.x = px;
      this.currentBird.y = py;
    } else {
      const ratio = C.SLING_MAX_PULL / d;
      this.currentBird.x = C.SLING_X + dx * ratio;
      this.currentBird.y = C.SLING_Y + dy * ratio;
    }
  },

  release() {
    if (this.shot !== 'DRAG' || !this.currentBird) return;

    const dx = this.currentBird.x - C.SLING_X;
    const dy = this.currentBird.y - C.SLING_Y;
    const d = Math.sqrt(dx * dx + dy * dy);

    // 최소 당김거리 미만이면 취소
    if (d < 12) {
      this.currentBird.x = C.SLING_X;
      this.currentBird.y = C.SLING_Y;
      this.shot = 'ARMED';
      return;
    }

    // 발사 속도 계산
    let vx = (C.SLING_X - this.currentBird.x) * C.LAUNCH_POWER;
    let vy = (C.SLING_Y - this.currentBird.y) * C.LAUNCH_POWER;
    const vlen = Math.sqrt(vx * vx + vy * vy);

    if (vlen > C.MAX_LAUNCH_SPEED) {
      const ratio = C.MAX_LAUNCH_SPEED / vlen;
      vx *= ratio;
      vy *= ratio;
    }

    // 월드에 새 추가
    const birdBody = P.addCircle(this.world, this.currentBird.x, this.currentBird.y,
      this.currentBird.r, {
        mat: 'bird',
        kind: 'bird',
        isStatic: false
      });
    birdBody.vx = vx;
    birdBody.vy = vy;
    birdBody.birdType = this.currentBird.birdType;
    birdBody.canAbility = true;
    birdBody.hitTime = 0;

    this.currentBird = birdBody;
    this.shot = 'FLYING';
    this.flyTime = 0;
  },

  tapAbility() {
    if (this.state !== 'PLAYING' || this.shot !== 'FLYING' || !this.currentBird) return;
    if (!this.currentBird.canAbility) return;

    const birdType = this.currentBird.birdType;
    const birdInfo = BIRD[birdType];

    if (birdInfo.ability === 'accelerate') {
      // 노란 새: 속도 ×1.9
      const v = Math.sqrt(this.currentBird.vx ** 2 + this.currentBird.vy ** 2);
      const newV = Math.min(v * 1.9, 2400);
      const ratio = newV / v;
      this.currentBird.vx *= ratio;
      this.currentBird.vy *= ratio;
      this.currentBird.canAbility = false;
      SFX.play('launch');
    } else if (birdInfo.ability === 'explode') {
      // 검은 새: 폭발
      this._explodeBird(this.currentBird);
    }
  },

  _explodeBird(bird) {
    if (!bird.canAbility) return;
    bird.canAbility = false;

    const nearby = P.queryRadius(this.world, bird.x, bird.y, C.EXPLODE_R);

    for (const b of nearby) {
      if (b === bird) continue;

      const dx = b.x - bird.x;
      const dy = b.y - bird.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const nx = d > 0 ? dx / d : 0;
      const ny = d > 0 ? dy / d : 1;

      const f = 1 - d / C.EXPLODE_R;
      if (f <= 0) continue;

      b.vx += nx * C.EXPLODE_IMPULSE * f * b.invMass;
      b.vy += ny * C.EXPLODE_IMPULSE * f * b.invMass;
      b.hp -= C.EXPLODE_DMG * f;

      if (b.hp <= 0 && b.hp !== Infinity) {
        b.dead = true;
      }
    }

    // 폭발 파티클
    this._createParticles(bird.x, bird.y, 20, '#f2a33c');

    // 새 제거
    bird.dead = true;

    this.shot = 'SETTLING';
    this.settlingTime = 0;

    SFX.play('break');
  },

  _createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 120 + Math.random() * 200;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7,
        maxLife: 0.7,
        color,
        size: 2 + Math.random() * 4
      });
    }
  },

  _onClear() {
    // 점수 계산
    const birdsLeft = this.birds.length - this.birdIndex - 1;
    this.score += birdsLeft * C.SCORE_BIRD_LEFT;

    // 별 계산 & 해금
    const maxScore = this.maxScore;
    let stars = 1;
    if (this.score >= maxScore * 0.75) stars = 3;
    else if (this.score >= maxScore * 0.50) stars = 2;

    // 저장
    try {
      const saved = JSON.parse(localStorage[C.SAVE_KEY] || '{}');
      saved.v = 1;
      saved.unlocked = Math.max(saved.unlocked || 1, Math.min(10, this.stageId + 1));
      saved.stars = saved.stars || {};
      saved.stars[this.stageId] = Math.max(saved.stars[this.stageId] || 0, stars);
      saved.best = saved.best || {};
      saved.best[this.stageId] = Math.max(saved.best[this.stageId] || 0, this.score);
      localStorage[C.SAVE_KEY] = JSON.stringify(saved);
    } catch (e) {}

    this.state = 'CLEAR';
    if (UI && UI.showClear) {
      UI.showClear(this, stars);
    }
    SFX.play('win');
  },

  _onFail() {
    this.state = 'FAIL';
    if (UI && UI.showFail) {
      UI.showFail(this);
    }
    SFX.play('lose');
  },

  pause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
    }
  },

  resume() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
    }
  },

  retry() {
    this.loadStage(this.stageId);
  },

  toMenu() {
    this.state = 'MENU';
    this.world = null;
    this.shot = 'ARMED';
    if (UI && UI.setScreen) {
      UI.setScreen('main');
    }
  }
};
