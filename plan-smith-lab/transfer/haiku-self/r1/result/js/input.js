class InputHandler {
    constructor(canvas, gameState, physicsEngine) {
        this.canvas = canvas;
        this.gameState = gameState;
        this.physicsEngine = physicsEngine;

        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // 마우스 이벤트
        this.canvas.addEventListener('mousedown', (e) => this.onDragStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.onDrag(e));
        this.canvas.addEventListener('mouseup', (e) => this.onDragEnd(e));

        // 터치 이벤트
        this.canvas.addEventListener('touchstart', (e) => this.onDragStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onDrag(e));
        this.canvas.addEventListener('touchend', (e) => this.onDragEnd(e));

        // UI 버튼
        document.getElementById('playBtn').addEventListener('click', () => this.handlePlayClick());
        document.getElementById('pauseBtn').addEventListener('click', () => this.handlePauseClick());
        document.getElementById('resumeBtn').addEventListener('click', () => this.handleResumeClick());
        document.getElementById('restartBtn').addEventListener('click', () => this.handleRestartClick());
        document.getElementById('mainMenuBtn').addEventListener('click', () => this.handleMenuClick());
        document.getElementById('nextBtn').addEventListener('click', () => this.handleNextClick());
        document.getElementById('mainMenuBtn2').addEventListener('click', () => this.handleMenuClick());
        document.getElementById('restartBtn2').addEventListener('click', () => this.handleRestartClick());
        document.getElementById('mainMenuBtn3').addEventListener('click', () => this.handleMenuClick());
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return { x, y };
    }

    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        return { x, y };
    }

    onDragStart(e) {
        if (this.gameState.phase !== 'playing' || !this.gameState.canShoot()) return;

        const pos = e.touches ? this.getTouchPos(e) : this.getMousePos(e);
        const slingPos = this.gameState.stageData.slingshot;

        // 슬링샷 영역 (반경 50px) 내에서만 드래그 시작
        const dx = pos.x - slingPos.x;
        const dy = pos.y - slingPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 50 && !this.gameState.birdFired) {
            this.isDragging = true;
            this.dragStartX = pos.x;
            this.dragStartY = pos.y;
            this.gameState.dragStart = pos;
            this.gameState.isAiming = true;
        }
    }

    onDrag(e) {
        if (!this.isDragging || this.gameState.phase !== 'playing') return;

        const pos = e.touches ? this.getTouchPos(e) : this.getMousePos(e);
        this.gameState.dragCurrent = pos;

        // 궤적 계산
        const forceX = (this.dragStartX - pos.x) * 0.02; // 드래그 거리 → 힘
        const forceY = (this.dragStartY - pos.y) * 0.02;

        this.gameState.trajectoryPoints = this.physicsEngine.simulateTrajectory(
            { position: this.gameState.stageData.slingshot },
            forceX,
            forceY,
            60
        );
    }

    onDragEnd(e) {
        if (!this.isDragging || this.gameState.phase !== 'playing') return;

        this.isDragging = false;

        if (this.gameState.dragStart && this.gameState.dragCurrent) {
            const forceX = (this.dragStartX - this.gameState.dragCurrent.x) * 0.02;
            const forceY = (this.dragStartY - this.gameState.dragCurrent.y) * 0.02;

            // 새 발사
            if (this.gameState.bodies.bird) {
                const bird = this.gameState.bodies.bird;
                Matter.Body.applyForce(bird, bird.position, { x: forceX, y: forceY });
                this.gameState.birdFired = true;
                this.gameState.usedMove();
            }
        }

        this.gameState.isAiming = false;
        this.gameState.dragStart = null;
        this.gameState.dragCurrent = null;
        this.gameState.trajectoryPoints = [];
    }

    handlePlayClick() {
        this.gameState.phase = 'playing';
        this.gameState.currentStage = 0;
        this.gameState.score = 0;
        this.hideAllOverlays();
    }

    handlePauseClick() {
        if (this.gameState.phase === 'playing') {
            this.gameState.phase = 'paused';
            this.showPauseOverlay();
        }
    }

    handleResumeClick() {
        this.gameState.phase = 'playing';
        this.hidePauseOverlay();
    }

    handleRestartClick() {
        this.gameState.resetStage();
        this.gameState.phase = 'playing';
        this.hideAllOverlays();
    }

    handleNextClick() {
        if (this.gameState.currentStage < 9) {
            this.gameState.nextStage();
            this.gameState.phase = 'playing';
        } else {
            // 모든 스테이지 완료
            this.gameState.phase = 'menu';
        }
        this.hideAllOverlays();
    }

    handleMenuClick() {
        this.gameState.toMenu();
        this.hideAllOverlays();
        this.showMenuScreen();
    }

    hideAllOverlays() {
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('pauseOverlay').style.display = 'none';
        document.getElementById('levelCompleteOverlay').style.display = 'none';
        document.getElementById('gameOverOverlay').style.display = 'none';
    }

    showMenuScreen() {
        document.getElementById('menuScreen').style.display = 'flex';
    }

    showPauseOverlay() {
        document.getElementById('pauseOverlay').style.display = 'flex';
    }

    hidePauseOverlay() {
        document.getElementById('pauseOverlay').style.display = 'none';
    }

    showLevelCompleteOverlay(score) {
        document.getElementById('levelScore').textContent = `Score: ${score}`;
        document.getElementById('levelCompleteOverlay').style.display = 'flex';
    }

    showGameOverOverlay(score) {
        document.getElementById('gameOverScore').textContent = `Final Score: ${score}`;
        document.getElementById('gameOverOverlay').style.display = 'flex';
    }
}
