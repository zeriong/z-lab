// Game state machine
const GameState = {
    currentState: 'mainMenu', // mainMenu, playing, paused, clear, failed
    currentStage: 0,
    pigs: 0,
    stableCounter: 0,
    completedStages: new Set(),

    setState: function(newState) {
        console.log(`State: ${this.currentState} -> ${newState}`);
        this.currentState = newState;

        if (newState === 'playing') {
            this.onPlayingEnter();
        } else if (newState === 'paused') {
            this.onPausedEnter();
        } else if (newState === 'clear') {
            this.onClearEnter();
        } else if (newState === 'mainMenu') {
            this.onMainMenuEnter();
        }
    },

    onPlayingEnter: function() {
        Physics.resume();
        document.getElementById('pauseButton').style.display = 'block';
        document.getElementById('pauseOverlay').style.display = 'none';
        document.getElementById('clearOverlay').style.display = 'none';
    },

    onPausedEnter: function() {
        Physics.pause();
        document.getElementById('pauseOverlay').style.display = 'flex';
    },

    onClearEnter: function() {
        Physics.pause();
        document.getElementById('clearOverlay').style.display = 'flex';
    },

    onMainMenuEnter: function() {
        Physics.clearWorld();
        document.getElementById('pauseButton').style.display = 'none';
        document.getElementById('pauseOverlay').style.display = 'none';
        document.getElementById('clearOverlay').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
    },

    checkClear: function() {
        if (this.pigs <= 0) {
            // Wait for stable state
            if (Collision.checkStableState()) {
                this.stableCounter++;
                if (this.stableCounter >= 120) { // 2 seconds at 60fps
                    this.setState('clear');
                }
            } else {
                this.stableCounter = 0;
            }
        }
    },

    nextStage: function() {
        this.completedStages.add(this.currentStage);
        this.currentStage++;

        if (this.currentStage >= STAGES.length) {
            // Game complete
            this.setState('mainMenu');
        } else {
            StageLoader.loadStage(this.currentStage);
            this.setState('playing');
        }
    },

    retryStage: function() {
        StageLoader.loadStage(this.currentStage);
        this.setState('playing');
    },

    loadStage: function(stageIndex) {
        this.currentStage = stageIndex;
        StageLoader.loadStage(stageIndex);
        this.setState('playing');
    },

    goToMainMenu: function() {
        this.setState('mainMenu');
    },

    togglePause: function() {
        if (this.currentState === 'playing') {
            this.setState('paused');
        } else if (this.currentState === 'paused') {
            this.setState('playing');
        }
    }
};
