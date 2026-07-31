class UI {
    constructor() {
        this.pauseBtn = document.getElementById('pause-btn');
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.clearOverlay = document.getElementById('clear-overlay');
        this.mainMenu = document.getElementById('main-menu');
        this.resumeBtn = document.getElementById('resume-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.menuBtn = document.getElementById('menu-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.menuBtnClear = document.getElementById('menu-btn-clear');
        this.startBtn = document.getElementById('start-btn');
        this.stageList = document.getElementById('stage-list');
        this.clearMessage = document.getElementById('clear-message');

        this.callbacks = {
            pause: null,
            resume: null,
            restart: null,
            menu: null,
            nextStage: null,
            startGame: null,
            stageSelect: null
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.pauseBtn.addEventListener('click', () => {
            if (this.callbacks.pause) {
                this.callbacks.pause();
            }
        });

        this.resumeBtn.addEventListener('click', () => {
            if (this.callbacks.resume) {
                this.callbacks.resume();
            }
        });

        this.restartBtn.addEventListener('click', () => {
            if (this.callbacks.restart) {
                this.callbacks.restart();
            }
        });

        this.menuBtn.addEventListener('click', () => {
            if (this.callbacks.menu) {
                this.callbacks.menu();
            }
        });

        this.nextBtn.addEventListener('click', () => {
            if (this.callbacks.nextStage) {
                this.callbacks.nextStage();
            }
        });

        this.menuBtnClear.addEventListener('click', () => {
            if (this.callbacks.menu) {
                this.callbacks.menu();
            }
        });

        this.startBtn.addEventListener('click', () => {
            if (this.callbacks.startGame) {
                this.callbacks.startGame();
            }
        });
    }

    showPauseOverlay() {
        this.pauseOverlay.classList.remove('hidden');
    }

    hidePauseOverlay() {
        this.pauseOverlay.classList.add('hidden');
    }

    showClearOverlay(stageIndex, time) {
        const minutes = Math.floor(time / 60000);
        const seconds = ((time % 60000) / 1000).toFixed(1);
        this.clearMessage.textContent = `Stage ${stageIndex + 1} Clear! Time: ${minutes}:${seconds}`;
        this.clearOverlay.classList.remove('hidden');
    }

    hideClearOverlay() {
        this.clearOverlay.classList.add('hidden');
    }

    showMainMenu(totalStages, completedStages) {
        this.mainMenu.classList.remove('hidden');
        this.pauseBtn.style.display = 'none';
        this.renderStageList(totalStages, completedStages);
    }

    hideMainMenu() {
        this.mainMenu.classList.add('hidden');
        this.pauseBtn.style.display = 'block';
    }

    renderStageList(totalStages, completedStages) {
        this.stageList.innerHTML = '';

        for (let i = 0; i < totalStages; i++) {
            const btn = document.createElement('button');
            btn.className = 'stage-btn';
            btn.textContent = `${i + 1}`;

            if (completedStages.has(i)) {
                btn.classList.add('completed');
            }

            btn.addEventListener('click', () => {
                if (this.callbacks.stageSelect) {
                    this.callbacks.stageSelect(i);
                }
            });

            this.stageList.appendChild(btn);
        }
    }

    onPause(callback) {
        this.callbacks.pause = callback;
    }

    onResume(callback) {
        this.callbacks.resume = callback;
    }

    onRestart(callback) {
        this.callbacks.restart = callback;
    }

    onMenu(callback) {
        this.callbacks.menu = callback;
    }

    onNextStage(callback) {
        this.callbacks.nextStage = callback;
    }

    onStartGame(callback) {
        this.callbacks.startGame = callback;
    }

    onStageSelect(callback) {
        this.callbacks.stageSelect = callback;
    }
}

export default UI;
