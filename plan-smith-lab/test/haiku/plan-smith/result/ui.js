// UI management
const UI = {
    init: function() {
        this.setupButtons();
        this.updateStageGrid();
    },

    setupButtons: function() {
        // Pause button
        document.getElementById('pauseButton').addEventListener('click', () => {
            GameState.togglePause();
        });

        // Pause overlay buttons
        document.getElementById('resumeBtn').addEventListener('click', () => {
            GameState.setState('playing');
        });

        document.getElementById('retryBtn').addEventListener('click', () => {
            GameState.retryStage();
        });

        document.getElementById('mainBtn').addEventListener('click', () => {
            GameState.goToMainMenu();
        });

        // Clear overlay buttons
        document.getElementById('nextBtn').addEventListener('click', () => {
            GameState.nextStage();
        });

        document.getElementById('mainBtn2').addEventListener('click', () => {
            GameState.goToMainMenu();
        });
    },

    updateStageGrid: function() {
        const grid = document.getElementById('stageGrid');
        grid.innerHTML = '';

        STAGES.forEach((stage, index) => {
            const btn = document.createElement('button');
            btn.className = 'stageButton';
            btn.textContent = `${index + 1}`;
            if (GameState.completedStages.has(index)) {
                btn.classList.add('completed');
            }
            btn.addEventListener('click', () => {
                document.getElementById('mainMenu').style.display = 'none';
                GameState.loadStage(index);
            });
            grid.appendChild(btn);
        });
    },

    updateStageInfo: function() {
        const info = document.getElementById('stageInfo');
        if (GameState.currentState === 'playing' || GameState.currentState === 'paused') {
            const pigs = Physics.getPigs().length;
            info.textContent = `Stage ${GameState.currentStage + 1}: ${STAGES[GameState.currentStage].name} | Pigs: ${pigs}`;
            info.style.display = 'block';
        } else {
            info.style.display = 'none';
        }
    }
};
