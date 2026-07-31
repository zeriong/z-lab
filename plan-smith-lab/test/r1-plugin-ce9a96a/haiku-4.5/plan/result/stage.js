// Stage management
class StageManager {
  constructor() {
    this.stages = [];
    this.currentStageIndex = 0;
    this.currentStageData = null;
  }

  async loadStages() {
    try {
      const response = await fetch('stages.json');
      const data = await response.json();
      this.stages = data.stages;
    } catch (e) {
      console.error('Failed to load stages:', e);
      this.stages = [];
    }
  }

  getCurrentStage() {
    if (this.currentStageIndex < this.stages.length) {
      return this.stages[this.currentStageIndex];
    }
    return null;
  }

  nextStage() {
    this.currentStageIndex++;
  }

  resetStage() {
    // No change to index, just reset the physics
  }

  hasNextStage() {
    return this.currentStageIndex < this.stages.length - 1;
  }

  getTotalStages() {
    return this.stages.length;
  }

  setStage(index) {
    if (index >= 0 && index < this.stages.length) {
      this.currentStageIndex = index;
      return true;
    }
    return false;
  }

  getCurrentStageIndex() {
    return this.currentStageIndex;
  }

  loadStageIntoWorld(stageData) {
    physicsEngine.clearWorld();

    if (!stageData) return;

    // Add structures
    if (stageData.structures) {
      stageData.structures.forEach(struct => {
        physicsEngine.addStructure(
          struct.x,
          struct.y,
          struct.width,
          struct.height,
          struct.material,
          struct.angle || 0
        );
      });
    }

    // Add pigs
    if (stageData.pigs) {
      stageData.pigs.forEach(pig => {
        physicsEngine.addPig(pig.x, pig.y, pig.radius || 10);
      });
    }

    // Add the first bird
    if (stageData.birds && stageData.birds.length > 0) {
      const bird = physicsEngine.addBird(100, 500, 8);
      slingshot.setBird(bird);
      stateManager.setState(GameState.AIMING);
    }
  }
}

const stageManager = new StageManager();
