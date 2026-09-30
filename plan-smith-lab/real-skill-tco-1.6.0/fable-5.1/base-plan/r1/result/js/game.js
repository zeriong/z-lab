window.AB = window.AB || {};

// 상태 머신·턴·점수·클리어 판정 (계획서 §7, §8.10, §11.4~11.6)
// state ∈ { MENU, SELECT, PLAYING, PAUSED, CLEARED, FAILED }
// phase ∈ { AIMING, FLYING, ENDING } (PLAYING/PAUSED 안에서만 의미 있음)
AB.Game = class Game {
  constructor() {
    this.state = 'MENU';
    this.phase = 'AIMING';
    this.levelId = 1;
    this.level = null;
    this.world = null;
    this.slingshot = new AB.Slingshot();
    this.effects = new AB.Effects();
    this.queue = [];               // 발사 대기 새 타입 배열
    this.currentBirdType = null;   // 새총에 장전된(미발사) 새 타입
    this.activeBird = null;        // 비행 중 새 엔티티
    this.score = 0;
    this.turnSteps = 0;
    this.settleCounter = 0;
    this.endingResult = null;      // 'WIN' | 'FAIL'
    this.endingSteps = 0;
    this.trail = [];               // 이전 샷 잔상 점
    this.resultStars = 0;          // 결과 패널용
    this.resultBonus = 0;
    this.progress = AB.Storage.load();
    this.onResume = null;          // main이 누적기 리셋용으로 설정
  }

  stepsPerSec() {
    return Math.round(1000 / AB.CONFIG.STEP_MS);
  }

  levelCount() {
    return AB.LEVELS.length;
  }

  // ---- 화면 전이 ----------------------------------------------------------

  goMenu() {
    this.state = 'MENU';
    if (this.world) {
      this.world.dispose();
      this.world = null;
    }
    this.activeBird = null;
    this.currentBirdType = null;
    this.queue = [];
    this.trail = [];
    this.slingshot.reset();
    this.effects.clear();
    AB.UI.sync(this);
  }

  goSelect() {
    this.state = 'SELECT';
    if (this.world) {
      this.world.dispose();
      this.world = null;
    }
    AB.UI.sync(this);
  }

  startLevel(id) {
    if (id >= 1 && id <= this.levelCount()) this.loadLevel(id);
  }

  restart() {
    this.loadLevel(this.levelId);
  }

  nextLevel() {
    if (this.levelId < this.levelCount()) this.loadLevel(this.levelId + 1);
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.slingshot.cancel();
    this.state = 'PAUSED';
    AB.UI.sync(this);
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    if (typeof this.onResume === 'function') this.onResume();
    AB.UI.sync(this);
  }

  togglePause() {
    if (this.state === 'PLAYING') this.pause();
    else if (this.state === 'PAUSED') this.resume();
  }

  // ---- 스테이지 로드 ------------------------------------------------------

  loadLevel(id) {
    const level = AB.LEVELS[id - 1];
    if (!level) return;
    this.levelId = id;
    this.level = level;
    this.score = 0;
    this.trail = [];
    this.effects.clear();

    if (this.world) this.world.dispose();
    this.world = new AB.World();
    (level.terrain || []).forEach((t) => this.world.addTerrain(t));
    (level.blocks || []).forEach((b) => this.world.addBlock(b));
    (level.pigs || []).forEach((p) => this.world.addPig(p));
    this.world.presettle();

    this.queue = level.birds.slice();
    this.activeBird = null;
    this.currentBirdType = null;
    this.endingResult = null;
    this.endingSteps = 0;
    this.resultStars = 0;
    this.resultBonus = 0;
    this.nextBird();
    this.state = 'PLAYING';
    AB.UI.sync(this);
  }

  // 큐에서 꺼내 새총에 장전. 호출 측이 큐가 비어 있지 않음을 보장한다.
  nextBird() {
    this.currentBirdType = this.queue.length ? this.queue.shift() : null;
    this.slingshot.reset();
    this.phase = 'AIMING';
    this.turnSteps = 0;
    this.settleCounter = 0;
  }

  // ---- 입력 (main이 캔버스 논리 좌표로 호출) ------------------------------

  onPointerDown(x, y) {
    if (this.state !== 'PLAYING') return;
    if (this.phase === 'AIMING') {
      if (this.currentBirdType) this.slingshot.tryGrab(x, y);
    } else if (this.phase === 'FLYING') {
      const b = this.activeBird;
      if (b && !b.dead && !b.abilityUsed) this.useAbility();
    }
  }

  onPointerMove(x, y) {
    if (this.state !== 'PLAYING') return;
    if (this.phase === 'AIMING' && this.slingshot.dragging) this.slingshot.drag(x, y);
  }

  onPointerUp(x, y) {
    if (this.state !== 'PLAYING') return;
    if (this.phase === 'AIMING' && this.slingshot.dragging) {
      const v = this.slingshot.release();
      if (v) this.launch(v);
    }
  }

  launch(v) {
    if (!this.world || !this.currentBirdType) return;
    const pos = this.slingshot.birdPos;
    this.activeBird = this.world.addBird(this.currentBirdType, pos.x, pos.y, v);
    this.currentBirdType = null;
    this.trail = [];
    this.phase = 'FLYING';
    this.turnSteps = 0;
    this.settleCounter = 0;
  }

  // 비행 중 탭(또는 봄 도화선)으로 발동. red는 아무것도 하지 않는다.
  useAbility() {
    const bird = this.activeBird;
    if (!bird || bird.dead || bird.abilityUsed || !this.world) return;
    bird.abilityUsed = true;
    const C = AB.CONFIG;
    const body = bird.body;
    const px = body.position.x, py = body.position.y;

    if (bird.birdType === 'chuck') {
      const cur = Matter.Body.getVelocity(body);
      const sp = Math.sqrt(cur.x * cur.x + cur.y * cur.y);
      if (sp > 0) {
        const ns = Math.min(sp * C.BOOST.mult, C.BOOST.maxSpeed);
        const k = ns / sp;
        Matter.Sleeping.set(body, false);
        Matter.Body.setVelocity(body, { x: cur.x * k, y: cur.y * k });
      }
      this.effects.burst(px, py, C.BIRD_TYPES.chuck.color, 6);
    } else if (bird.birdType === 'bomb') {
      this.world.explode(px, py);
      this.effects.ring(px, py, C.EXPLOSION.radius);
      this.effects.burst(px, py, '#ff8c1a', 16);
      this.world.remove(bird);
      this.activeBird = null;
    }
  }

  // ---- 고정 스텝 (main 루프가 PLAYING일 때 호출) --------------------------

  step() {
    if (!this.world) return;
    this.world.step();
    this.handleEvents(this.world.drainEvents());
    if (this.phase === 'FLYING') this.flyingStep();
    if (this.phase === 'ENDING') this.endingStep();
    else if (this.world.pigs().length === 0) this.beginEnding('WIN');
  }

  flyingStep() {
    const C = AB.CONFIG;
    const SPS = this.stepsPerSec();
    this.turnSteps++;

    const bird = this.activeBird;
    if (bird && !bird.dead) {
      if (this.turnSteps % C.TRAIL.everySteps === 0) {
        this.trail.push({ x: bird.body.position.x, y: bird.body.position.y });
        if (this.trail.length > C.TRAIL.maxPoints) this.trail.shift();
      }
      if (bird.birdType === 'bomb' && !bird.abilityUsed && bird.hitAtStep != null &&
          (this.world.stepCount - bird.hitAtStep) >= C.EXPLOSION.fuseSec * SPS) {
        this.useAbility();   // 이후로는 activeBird를 다시 참조하지 않는다
      }
    }

    if (this.world.allSettled()) this.settleCounter++;
    else this.settleCounter = 0;

    const sec = this.turnSteps / SPS;
    if ((sec >= C.TURN.minSec && this.settleCounter >= C.TURN.settleSteps) || sec >= C.TURN.maxSec) {
      this.endTurn();
    }
  }

  endTurn() {
    const bird = this.activeBird;
    if (bird && !bird.dead && bird.body) {
      this.effects.burst(bird.body.position.x, bird.body.position.y, '#9a9a9a', 5);
      this.world.remove(bird);
    }
    this.activeBird = null;
    if (this.world.pigs().length === 0) { this.beginEnding('WIN'); return; }
    if (this.queue.length === 0) { this.beginEnding('FAIL'); return; }
    this.nextBird();
  }

  beginEnding(result) {
    this.phase = 'ENDING';
    this.endingResult = result;
    this.endingSteps = 0;
    this.slingshot.cancel();
  }

  endingStep() {
    const C = AB.CONFIG;
    this.endingSteps++;
    const delay = this.endingResult === 'WIN' ? C.WIN_DELAY_SEC : C.FAIL_DELAY_SEC;
    if (this.endingSteps >= delay * this.stepsPerSec()) this.finish();
  }

  finish() {
    const C = AB.CONFIG;
    if (this.endingResult === 'WIN') {
      // 큐에 남은 새 + 장전만 되고 미발사인 새
      const bonus = this.birdsLeft() * C.SCORE.birdBonus;
      this.resultBonus = bonus;
      this.score += bonus;
      const stars = this.score >= this.level.star3 ? 3 : (this.score >= this.level.star2 ? 2 : 1);
      this.resultStars = stars;
      this.progress = AB.Storage.markCleared(this.levelId, this.score, stars);
      this.state = 'CLEARED';
    } else {
      this.resultStars = 0;
      this.resultBonus = 0;
      this.state = 'FAILED';   // 실패는 저장하지 않는다
    }
    AB.UI.sync(this);
  }

  handleEvents(events) {
    if (!events || !events.length) return;
    const C = AB.CONFIG;
    for (const ev of events) {
      if (ev.type === 'pigKilled') {
        this.score += C.SCORE.pig;
        this.effects.burst(ev.x, ev.y, '#6fcf4a', 10);
        this.effects.text(ev.x, ev.y, '+' + C.SCORE.pig);
      } else if (ev.type === 'blockDestroyed') {
        const mat = C.MATERIALS[ev.material];
        if (!mat) continue;
        this.score += mat.score;
        this.effects.burst(ev.x, ev.y, mat.fill, 8);
        this.effects.text(ev.x, ev.y, '+' + mat.score);
      }
    }
  }

  birdsLeft() {
    return this.queue.length + (this.currentBirdType ? 1 : 0);
  }
};
