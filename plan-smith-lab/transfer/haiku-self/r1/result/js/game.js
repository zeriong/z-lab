class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.gameState = new GameState();
        this.physicsEngine = new PhysicsEngine();
        this.renderer = new Renderer(this.canvas);
        this.inputHandler = new InputHandler(this.canvas, this.gameState, this.physicsEngine);

        this.lastFrameTime = 0;
        this.levelStartTime = 0;

        this.init();
    }

    init() {
        this.showMenuScreen();
        this.gameState.phase = 'menu';
    }

    showMenuScreen() {
        this.inputHandler.hideAllOverlays();
        this.inputHandler.showMenuScreen();
    }

    loadStage(stageIndex) {
        this.gameState.resetStage();

        if (stageIndex >= STAGES.length) {
            this.gameState.phase = 'menu';
            return;
        }

        const stageData = STAGES[stageIndex];
        this.gameState.stageData = stageData;
        this.gameState.currentStage = stageIndex;

        // 물리 엔진 초기화
        this.physicsEngine.clearWorld();

        // 바닥 생성
        const ground = Matter.Bodies.rectangle(400, 580, 800, 40, {
            isStatic: true,
            label: 'ground'
        });
        Matter.World.add(this.physicsEngine.engine.world, ground);

        // 벽
        const leftWall = Matter.Bodies.rectangle(10, 300, 20, 600, {
            isStatic: true,
            label: 'obstacle'
        });
        const rightWall = Matter.Bodies.rectangle(790, 300, 20, 600, {
            isStatic: true,
            label: 'obstacle'
        });
        Matter.World.add(this.physicsEngine.engine.world, leftWall);
        Matter.World.add(this.physicsEngine.engine.world, rightWall);

        // 새 생성 (아직 발사 안 됨)
        const bird = this.physicsEngine.createCircle(
            stageData.slingshot.x,
            stageData.slingshot.y,
            10,
            false,
            'bird'
        );
        this.gameState.bodies.bird = bird;

        // 돼지 생성
        for (let pig of stageData.pigs) {
            const pigBody = this.physicsEngine.createCircle(pig.x, pig.y, 8, false, 'pig');
            pigBody.hp = pig.hp;
            this.gameState.bodies.pigs.push(pigBody);
        }

        // 블록 생성
        for (let block of stageData.blocks) {
            const blockBody = this.physicsEngine.createRectangle(
                block.x,
                block.y,
                block.w,
                block.h,
                false,
                'block'
            );
            blockBody.hp = block.hp;
            blockBody.material = block.material;
            this.gameState.bodies.blocks.push(blockBody);
        }

        this.gameState.phase = 'playing';
        this.levelStartTime = Date.now();
    }

    updateGame(deltaTime) {
        if (this.gameState.phase === 'menu') {
            return;
        }

        if (this.gameState.phase === 'paused') {
            return;
        }

        if (this.gameState.phase !== 'playing') {
            return;
        }

        // 물리 스텝
        this.physicsEngine.step(deltaTime / 1000);

        // 새 상태 추적
        if (this.gameState.birdFired && this.gameState.bodies.bird) {
            const bird = this.gameState.bodies.bird;
            const speed = bird.speed || Math.sqrt(bird.velocity.x ** 2 + bird.velocity.y ** 2);

            if (speed < 0.5) {
                this.gameState.birdSettleTime += deltaTime;
            } else {
                this.gameState.birdSettleTime = 0;
            }

            // 화면 밖으로 나가면 정리
            if (bird.position.y > 650 || bird.position.x < -50 || bird.position.x > 850) {
                this.physicsEngine.removeBody(bird);
                this.gameState.bodies.bird = null;
            }
        }

        // 돼지/블록 손상 및 파괴 체크
        this.checkCollisionsAndDamage();

        // 클리어 조건 확인
        if (this.gameState.getAllPigsDestroyed() && this.gameState.birdSettled()) {
            this.gameState.phase = 'levelComplete';
            this.onLevelComplete();
        }

        // 게임 오버 조건 (새 없고 돼지 남음)
        if (!this.gameState.bodies.bird && !this.gameState.birdFired &&
            this.gameState.bodies.pigs.length > 0 &&
            this.gameState.getRemainingMoves() === 0) {
            this.gameState.phase = 'gameOver';
            this.inputHandler.showGameOverOverlay(this.gameState.score);
        }

        // 새 발사 후 정착하면 다음 발사 준비
        if (this.gameState.birdFired && this.gameState.isBirdSettled()) {
            if (this.gameState.getRemainingMoves() > 0) {
                // 새 발사 상태 리셋
                this.gameState.birdFired = false;
                this.gameState.birdSettleTime = 0;

                // 새 생성
                const bird = this.physicsEngine.createCircle(
                    this.gameState.stageData.slingshot.x,
                    this.gameState.stageData.slingshot.y,
                    10,
                    false,
                    'bird'
                );
                this.gameState.bodies.bird = bird;
            }
        }
    }

    checkCollisionsAndDamage() {
        // Matter.js의 바디들을 순회하며 충돌 에너지 계산
        const bodies = this.physicsEngine.engine.world.bodies;

        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const bodyA = bodies[i];
                const bodyB = bodies[j];

                // 충돌 거리 체크
                const dx = bodyA.position.x - bodyB.position.x;
                const dy = bodyA.position.y - bodyB.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const radiusA = bodyA.circleRadius || 20;
                const radiusB = bodyB.circleRadius || 20;

                if (dist < radiusA + radiusB) {
                    // 충돌 발생
                    const speedA = bodyA.speed || 0;
                    const speedB = bodyB.speed || 0;
                    const damageAmount = (speedA + speedB) * 2;

                    // 돼지/블록 손상 적용
                    if (bodyB.label === 'pig' || bodyB.label === 'block') {
                        if (bodyB.hp !== undefined) {
                            bodyB.hp -= damageAmount;
                            if (bodyB.hp <= 0) {
                                this.destroyBody(bodyB);
                            }
                        }
                    }

                    if (bodyA.label === 'pig' || bodyA.label === 'block') {
                        if (bodyA.hp !== undefined) {
                            bodyA.hp -= damageAmount;
                            if (bodyA.hp <= 0) {
                                this.destroyBody(bodyA);
                            }
                        }
                    }
                }
            }
        }
    }

    destroyBody(body) {
        if (body.label === 'pig') {
            const index = this.gameState.bodies.pigs.indexOf(body);
            if (index > -1) {
                this.gameState.bodies.pigs.splice(index, 1);
                this.gameState.addScore(1000);
            }
        } else if (body.label === 'block') {
            const index = this.gameState.bodies.blocks.indexOf(body);
            if (index > -1) {
                this.gameState.bodies.blocks.splice(index, 1);
                this.gameState.addScore(-10); // 블록 남김 페널티
            }
        }
        this.physicsEngine.removeBody(body);
    }

    onLevelComplete() {
        const bonusScore = this.gameState.getRemainingMoves() * 500;
        this.gameState.addScore(bonusScore);
        this.inputHandler.showLevelCompleteOverlay(this.gameState.score);
    }

    render() {
        if (this.gameState.phase === 'menu') {
            this.renderer.clear();
            return;
        }

        this.renderer.drawGame(this.gameState, this.physicsEngine);
        this.renderer.updateHUD(this.gameState);
    }

    gameLoop(currentTime) {
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = currentTime;
        }

        const deltaTime = Math.min(currentTime - this.lastFrameTime, 16.67); // Cap at 60fps
        this.lastFrameTime = currentTime;

        if (this.gameState.phase === 'playing') {
            this.updateGame(deltaTime);
        }

        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    start() {
        // 게임 루프 시작
        requestAnimationFrame((time) => this.gameLoop(time));

        // 플레이 버튼 클릭 리스너 오버라이드
        document.getElementById('playBtn').addEventListener('click', () => {
            this.gameState.phase = 'playing';
            this.gameState.currentStage = 0;
            this.gameState.score = 0;
            this.loadStage(0);
            this.inputHandler.hideAllOverlays();
        });

        // 다음 레벨 버튼
        document.getElementById('nextBtn').addEventListener('click', () => {
            if (this.gameState.currentStage < 9) {
                this.loadStage(this.gameState.currentStage + 1);
                this.inputHandler.hideAllOverlays();
            } else {
                this.showMenuScreen();
            }
        });

        // 재시작 버튼
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.loadStage(this.gameState.currentStage);
            this.inputHandler.hideAllOverlays();
        });

        document.getElementById('restartBtn2').addEventListener('click', () => {
            this.loadStage(this.gameState.currentStage);
            this.inputHandler.hideAllOverlays();
        });

        // 메인 메뉴 버튼들
        document.getElementById('mainMenuBtn').addEventListener('click', () => {
            this.showMenuScreen();
        });

        document.getElementById('mainMenuBtn2').addEventListener('click', () => {
            this.showMenuScreen();
        });

        document.getElementById('mainMenuBtn3').addEventListener('click', () => {
            this.showMenuScreen();
        });
    }
}

// 게임 시작
const game = new Game();
game.start();
