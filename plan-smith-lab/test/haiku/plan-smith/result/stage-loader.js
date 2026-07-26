// Stage loading and management
const StageLoader = {
    loadStage: function(stageIndex) {
        // Clear previous stage
        Physics.clearWorld();

        const stage = STAGES[stageIndex];
        if (!stage) {
            console.error('Stage not found:', stageIndex);
            return;
        }

        // Update game state
        GameState.currentStage = stageIndex;
        GameState.stableCounter = 0;

        // Load bodies from stage data
        stage.bodies.forEach(bodyData => {
            Physics.createBody(bodyData);
        });

        // Update slingshot position
        Slingshot.init(stage.slingshot.x, stage.slingshot.y);
        Slingshot.canShoot = true;
        Slingshot.projectile = null;

        // Count pigs
        GameState.pigs = stage.bodies.filter(b => b.type === 'pig').length;

        UI.updateStageInfo();
    }
};
