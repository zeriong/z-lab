const Game = {
  // 상태
  state: 'MENU',
  stageNo: 0,
  pigs: [],
  blocks: [],
  birdsLeft: 0,
  currentBird: null,
  dragging: false,
  score: 0,
  settleFrames: 0,

  // 렌더링
  canvas: null,
  ctx: null,

  // 파티클
  particles: [],

  // 스테이지 상수
  ANCHOR_X: 200,
  ANCHOR_Y: 540,
  MAX_DRAG: 120,
  LAUNCH_K: 0.22,
  PREVIEW_STEPS: 18,
  PREVIEW_INTERVAL: 3,

  // 프레임 카운터
  turnStartFrame: 0,
  MAX_TURN_TIME: 6000,

  boot() {
    // Matter 로드 확인
    if (typeof Matter === 'undefined') {
      const banner = document.getElementById('load-banner');
      if (banner) {
        banner.classList.add('visible');
      }
      return;
    }

    // 캔버스 초기화
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // 물리 엔진 생성
    Physics.createWorld();

    // 충돌 핸들러에 파티클/음향 통합
    this.setupCollisionEffects();

    // UI 초기화
    UI.init();

    // 메뉴 표시
    this.state = 'MENU';
    UI.show('menu');
    UI.hide('select');
    UI.hide('pause');
    UI.hide('clear');
    UI.hide('fail');

    // 게임 루프 시작
    requestAnimationFrame(this.tick.bind(this));
  },

  setupCollisionEffects() {
    const { Events } = Matter;
    Events.on(Physics.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        if (!bodyA.plugin.dead && bodyB.plugin.kind === 'block') {
          if (bodyB.plugin.dead) {
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI * 2 * i) / 8;
              Game.particles.push({
                x: bodyB.position.x,
                y: bodyB.position.y,
                angle: angle,
                size: 6 + Math.random() * 4,
                lifetime: 600,
                time: Date.now()
              });
            }
            Sound.play('hit');
          }
        }

        if (!bodyA.plugin.dead && bodyB.plugin.kind === 'pig') {
          if (bodyB.plugin.dead) {
            Sound.play('pop');
          }
        }

        if (!bodyB.plugin.dead && bodyA.plugin.kind === 'block') {
          if (bodyA.plugin.dead) {
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI * 2 * i) / 8;
              Game.particles.push({
                x: bodyA.position.x,
                y: bodyA.position.y,
                angle: angle,
                size: 6 + Math.random() * 4,
                lifetime: 600,
                time: Date.now()
              });
            }
            Sound.play('hit');
          }
        }

        if (!bodyB.plugin.dead && bodyA.plugin.kind === 'pig') {
          if (bodyA.plugin.dead) {
            Sound.play('pop');
          }
        }
      });
    });
  },

  start(stageNum) {
    this.stageNo = stageNum;
    this.state = 'PLAYING';

    const stage = STAGES[stageNum - 1];
    if (!stage) return;

    // 물리 로드
    const { blocks, pigs } = Physics.loadStage(stage);
    this.blocks = blocks;
    this.pigs = pigs;

    // 게임 상태 초기화
    this.birdsLeft = stage.birds;
    this.score = 0;
    this.particles = [];
    this.settleFrames = 0;
    this.turnStartFrame = Date.now();

    // 첫 새 배치
    this.currentBird = { x: this.ANCHOR_X, y: this.ANCHOR_Y };

    // UI 갱신
    UI.hide('menu');
    UI.hide('select');
    UI.hide('pause');
    UI.hide('clear');
    UI.hide('fail');
    UI.setHud(this.score, this.birdsLeft);
  },

  showSelect() {
    this.state = 'SELECT';
    UI.renderSelect();
    UI.show('select');
    UI.hide('menu');
  },

  launchBird() {
    if (this.state !== 'PLAYING' || !this.dragging || this.birdsLeft <= 0) return;

    // 드래그 거리로 속도 계산
    const dragX = this.currentBird.x - this.ANCHOR_X;
    const dragY = this.currentBird.y - this.ANCHOR_Y;
    const dragDist = Math.hypot(dragX, dragY);

    // 반대 방향으로 발사
    const angle = Math.atan2(dragY, dragX);
    const speed = dragDist * this.LAUNCH_K;

    const vx = -Math.cos(angle) * speed;
    const vy = -Math.sin(angle) * speed;

    // 새 바디 생성
    Physics.spawnBirdBody(this.ANCHOR_X, this.ANCHOR_Y, vx, vy);

    // 상태 업데이트
    this.dragging = false;
    this.currentBird = null;
    this.birdsLeft--;
    this.settleFrames = 0;
    this.turnStartFrame = Date.now();

    // 음향
    Sound.play('launch');

    // HUD 갱신
    UI.setHud(this.score, this.birdsLeft);
  },

  checkResult() {
    if (this.state !== 'PLAYING') return;

    // 클리어 (돼지 전무)
    if (this.pigs.length === 0) {
      this.finalizeClear();
      return;
    }

    // 실패 (새 없고 정지)
    if (this.birdsLeft === 0 && (this.settleFrames >= 45 || Date.now() - this.turnStartFrame > this.MAX_TURN_TIME)) {
      this.finalizeFail();
      return;
    }

    // 턴 종료 (정지 판정 시)
    if (this.settleFrames >= 45 || Date.now() - this.turnStartFrame > this.MAX_TURN_TIME) {
      if (this.currentBird === null && this.birdsLeft > 0) {
        // 다음 새 배치
        this.currentBird = { x: this.ANCHOR_X, y: this.ANCHOR_Y };
        this.settleFrames = 0;
        this.turnStartFrame = Date.now();
      }
    }
  },

  finalizeClear() {
    this.state = 'CLEAR';

    // 별 계산
    const stage = STAGES[this.stageNo - 1];
    const maxScore = stage.pigs.length * 5000 + stage.blocks.length * 500 + (stage.birds - 1) * 10000;
    const bonusScore = Math.max(0, (stage.birds - (stage.birds - this.birdsLeft)) * 10000);
    const totalScore = this.score + bonusScore;

    let stars = 1;
    if (totalScore >= maxScore * 0.7) stars = 3;
    else if (totalScore >= maxScore * 0.5) stars = 2;

    // 진행 저장
    const progress = Store.load();
    progress.unlocked = Math.max(progress.unlocked, this.stageNo + 1);
    if (!progress.stars) progress.stars = {};
    progress.stars[this.stageNo] = Math.max(progress.stars[this.stageNo] || 0, stars);
    Store.save(progress);

    // UI 표시
    document.getElementById('clear-score').textContent = `점수: ${totalScore}`;
    document.getElementById('clear-stars').textContent = '★'.repeat(stars);

    UI.show('clear');

    // 10스테이지 클리어 시 다음 버튼 숨김
    const nextBtn = document.getElementById('btn-next');
    if (this.stageNo === 10) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = 'inline-block';
    }
  },

  finalizeFail() {
    this.state = 'FAIL';
    document.getElementById('fail-msg').textContent = '새를 모두 사용했습니다';
    UI.show('fail');
  },

  tick() {
    requestAnimationFrame(this.tick.bind(this));

    // 상태별 처리
    if (this.state === 'PLAYING') {
      // 물리 스텝
      Physics.step();

      // 점수 갱신 (충돌 후 파괴된 바디 처리)
      const allBodies = Matter.Composite.allBodies(Physics.engine.world);
      allBodies.forEach((body) => {
        if (body.plugin.dead && !body.plugin.scored) {
          if (body.plugin.kind === 'pig') {
            this.score += 5000;
          } else if (body.plugin.kind === 'block') {
            this.score += 500;
          }
          body.plugin.scored = true;
        }
      });

      // 정지 판정
      if (Physics.isSettled()) {
        this.settleFrames++;
      } else {
        this.settleFrames = 0;
      }

      // 결과 판정
      this.checkResult();

      // HUD 갱신
      UI.setHud(this.score, this.birdsLeft);
    }

    // 렌더 (모든 상태에서 수행)
    this.render();
  },

  render() {
    const { ctx, canvas } = this;

    // 캔버스 비우기
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 배경 그라디언트 (하늘)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(1, '#e0f6ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 먼 언덕 (배경)
    ctx.fillStyle = '#7cb342';
    ctx.beginPath();
    ctx.ellipse(400, 300, 300, 150, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(900, 280, 400, 180, 0, 0, Math.PI * 2);
    ctx.fill();

    // 초록 지면
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 640, canvas.width, canvas.height - 640);

    // 새총 기둥
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(150, 400, 40, 240);
    ctx.fillRect(200, 400, 40, 240);

    // 새총 걸이
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.ANCHOR_X, this.ANCHOR_Y, 15, 0, Math.PI * 2);
    ctx.stroke();

    // 물리 바디 렌더
    const { Composite } = Matter;
    const allBodies = Composite.allBodies(Physics.engine.world);

    allBodies.forEach((body) => {
      if (body.isStatic) return;

      const plugin = body.plugin;
      if (plugin.dead) return;

      // 블록/돼지 렌더
      if (plugin.kind === 'block' || plugin.kind === 'pig') {
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        ctx.fillStyle = plugin.color;
        if (plugin.kind === 'block') {
          ctx.fillRect(-plugin.w / 2, -plugin.h / 2, plugin.w, plugin.h);
        } else if (plugin.kind === 'pig') {
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // 새 렌더
      if (plugin.kind === 'bird') {
        ctx.fillStyle = plugin.color;
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, 18, 0, Math.PI * 2);
        ctx.fill();

        // 새 눈
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(body.position.x - 6, body.position.y - 4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(body.position.x - 6, body.position.y - 4, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 새 비행 잔상
    allBodies.forEach((body) => {
      if (body.plugin.kind === 'bird' && !body.plugin.dead) {
        // 이전 위치 저장
        if (!body.plugin.trailPos) {
          body.plugin.trailPos = [];
        }
        body.plugin.trailPos.push({ x: body.position.x, y: body.position.y });
        if (body.plugin.trailPos.length > 20) {
          body.plugin.trailPos.shift();
        }

        // 잔상 렌더
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.1)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (body.plugin.trailPos.length > 0) {
          ctx.moveTo(body.plugin.trailPos[0].x, body.plugin.trailPos[0].y);
          body.plugin.trailPos.forEach((pos) => {
            ctx.lineTo(pos.x, pos.y);
          });
          ctx.stroke();
        }
      }
    });

    // 파티클 렌더 및 업데이트
    const now = Date.now();
    this.particles = this.particles.filter((p) => now - p.time < p.lifetime);

    this.particles.forEach((p) => {
      const age = now - p.time;
      const progress = age / p.lifetime;
      const opacity = 1 - progress;

      ctx.fillStyle = `rgba(139, 69, 19, ${opacity * 0.7})`;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    // 드래그 중: 궤적 및 고무줄
    if (this.state === 'PLAYING' && this.dragging && this.currentBird) {
      const dragX = this.currentBird.x - this.ANCHOR_X;
      const dragY = this.currentBird.y - this.ANCHOR_Y;

      // 고무줄
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.ANCHOR_X, this.ANCHOR_Y);
      ctx.lineTo(this.currentBird.x, this.currentBird.y);
      ctx.stroke();

      // 새 위치
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(this.currentBird.x, this.currentBird.y, 18, 0, Math.PI * 2);
      ctx.fill();

      // 궤적 점 예측
      const angle = Math.atan2(dragY, dragX);
      const speed = Math.hypot(dragX, dragY) * this.LAUNCH_K;
      const vx = -Math.cos(angle) * speed;
      const vy = -Math.sin(angle) * speed;

      let px = this.ANCHOR_X;
      let py = this.ANCHOR_Y;
      let pvx = vx;
      let pvy = vy;

      ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
      for (let i = 0; i < this.PREVIEW_STEPS; i++) {
        for (let j = 0; j < this.PREVIEW_INTERVAL; j++) {
          pvy += this.gravity;
          px += pvx;
          py += pvy;
        }

        if (px >= -200 && px <= 1480 && py <= 920) {
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  },

  // 포인터 입력 처리
  onPointerDown(e) {
    if (Game.state !== 'PLAYING' || !Game.currentBird) return;

    const rect = Game.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (1280 / rect.width);
    const y = (e.clientY - rect.top) * (720 / rect.height);

    const dist = Math.hypot(x - Game.ANCHOR_X, y - Game.ANCHOR_Y);
    if (dist < 60) {
      Game.dragging = true;
      Game.currentBird.x = x;
      Game.currentBird.y = y;
    }
  },

  onPointerMove(e) {
    if (!Game.dragging) return;

    const rect = Game.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (1280 / rect.width);
    const y = (e.clientY - rect.top) * (720 / rect.height);

    // 최대 당김 거리 제한
    const dx = x - Game.ANCHOR_X;
    const dy = y - Game.ANCHOR_Y;
    const dist = Math.hypot(dx, dy);

    if (dist > Game.MAX_DRAG) {
      const angle = Math.atan2(dy, dx);
      Game.currentBird.x = Game.ANCHOR_X + Math.cos(angle) * Game.MAX_DRAG;
      Game.currentBird.y = Game.ANCHOR_Y + Math.sin(angle) * Game.MAX_DRAG;
    } else {
      Game.currentBird.x = x;
      Game.currentBird.y = y;
    }
  },

  onPointerUp(e) {
    if (!Game.dragging) return;
    Game.launchBird();
  }
};

// 포인터 입력 바인딩
document.getElementById('game-canvas').addEventListener('pointerdown', Game.onPointerDown.bind(Game));
document.getElementById('game-canvas').addEventListener('pointermove', Game.onPointerMove.bind(Game));
document.getElementById('game-canvas').addEventListener('pointerup', Game.onPointerUp.bind(Game));
document.getElementById('game-canvas').addEventListener('pointerleave', Game.onPointerUp.bind(Game));
