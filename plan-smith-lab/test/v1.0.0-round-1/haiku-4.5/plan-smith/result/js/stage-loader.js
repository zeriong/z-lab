let Bodies;

async function loadMatterJs() {
    if (typeof Matter !== 'undefined') {
        return Matter;
    }
    return window.Matter;
}

class StageLoader {
    constructor(physicsEngine, collisionHandler) {
        this.physicsEngine = physicsEngine;
        this.collisionHandler = collisionHandler;
        this.stages = [];
        this.currentStage = null;
    }

    async initialize() {
        const Matter = await loadMatterJs();
        Bodies = Matter.Bodies;

        // Load stages
        const response = await fetch('stages/stage01.json');
        if (!response.ok) {
            console.error('Failed to load stages');
            return;
        }

        const data = await response.json();
        this.stages = data.stages || [];
    }

    async loadStage(stageIndex) {
        if (stageIndex < 0 || stageIndex >= this.stages.length) {
            return null;
        }

        // Clear previous stage
        this.physicsEngine.reset();
        this.collisionHandler.reset();

        const stageData = this.stages[stageIndex];
        this.currentStage = stageData;

        // Create ground
        const ground = Bodies.rectangle(600, 680, 1200, 40, {
            isStatic: true,
            label: 'ground'
        });
        this.physicsEngine.addBody(ground);
        this.collisionHandler.registerEntity(ground, 'ground');

        // Create stage bodies
        const createdBodies = [];

        if (stageData.bodies && Array.isArray(stageData.bodies)) {
            for (const bodyData of stageData.bodies) {
                let body = null;

                if (bodyData.type === 'pig') {
                    body = Bodies.circle(bodyData.x, bodyData.y, bodyData.radius || 15, {
                        restitution: 0.8,
                        label: 'pig',
                        circleRadius: bodyData.radius || 15
                    });
                    this.physicsEngine.addBody(body);
                    this.collisionHandler.registerEntity(body, 'pig');
                } else if (bodyData.type.includes('wood') || bodyData.type.includes('stone') || bodyData.type.includes('ice')) {
                    const width = bodyData.width || 50;
                    const height = bodyData.height || 10;

                    body = Bodies.rectangle(bodyData.x, bodyData.y, width, height, {
                        restitution: 0.5,
                        friction: 0.5,
                        label: bodyData.type,
                        isStatic: bodyData.isStatic || false
                    });

                    if (bodyData.rotation) {
                        const Matter = await loadMatterJs();
                        Matter.Body.setAngle(body, bodyData.rotation);
                    }

                    this.physicsEngine.addBody(body);
                    this.collisionHandler.registerEntity(body, 'structure');
                }

                if (body) {
                    createdBodies.push(body);
                }
            }
        }

        return {
            index: stageIndex,
            data: stageData,
            bodies: createdBodies
        };
    }

    getCurrentStage() {
        return this.currentStage;
    }

    getStages() {
        return this.stages;
    }

    getStageCount() {
        return this.stages.length;
    }
}

export default StageLoader;
