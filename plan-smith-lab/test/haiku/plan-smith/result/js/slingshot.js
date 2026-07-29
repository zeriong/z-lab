import { SLINGSHOT_MAX_DISTANCE, SLINGSHOT_FORCE_MULTIPLIER, TRAJECTORY_POINTS } from './constants.js';

let Bodies;

async function loadMatterJs() {
    if (typeof Matter !== 'undefined') {
        return Matter;
    }
    return window.Matter;
}

class Slingshot {
    constructor(x, y, physicsEngine) {
        this.x = x;
        this.y = y;
        this.physicsEngine = physicsEngine;

        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragCurrentX = 0;
        this.dragCurrentY = 0;

        this.trajectory = [];
        this.angle = 0;
        this.power = 0;

        this.currentBird = null;
        this.launchCooldown = 0;

        this.canLaunch = true;
    }

    async initialize() {
        const Matter = await loadMatterJs();
        Bodies = Matter.Bodies;
    }

    startDrag(screenX, screenY, renderer) {
        if (!this.canLaunch || this.currentBird) return false;

        this.isDragging = true;
        this.dragStartX = screenX;
        this.dragStartY = screenY;
        this.dragCurrentX = screenX;
        this.dragCurrentY = screenY;

        return true;
    }

    updateDrag(screenX, screenY, renderer) {
        if (!this.isDragging) return;

        this.dragCurrentX = screenX;
        this.dragCurrentY = screenY;

        // Calculate drag distance and angle
        const dx = this.dragCurrentX - this.dragStartX;
        const dy = this.dragCurrentY - this.dragStartY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Clamp to max distance
        const clampedDistance = Math.min(distance, SLINGSHOT_MAX_DISTANCE);
        this.angle = Math.atan2(dy, dx);
        this.power = clampedDistance;

        // Update trajectory
        this.updateTrajectory(renderer);
    }

    launch(renderer) {
        if (!this.isDragging || !this.canLaunch) return null;

        this.isDragging = false;

        // Calculate velocity based on drag distance
        const velocity = this.power * SLINGSHOT_FORCE_MULTIPLIER;
        const velocityX = Math.cos(this.angle) * velocity;
        const velocityY = Math.sin(this.angle) * velocity;

        // Create bird body
        const bird = Bodies.circle(this.x, this.y, 12, {
            restitution: 0.8,
            friction: 0.1,
            label: 'bird',
            circleRadius: 12
        });

        bird.velocity = { x: velocityX, y: velocityY };

        this.currentBird = bird;
        this.physicsEngine.addBody(bird);

        this.trajectory = [];
        this.canLaunch = false;
        this.launchCooldown = 3000; // 3 seconds

        return bird;
    }

    updateTrajectory(renderer) {
        if (!this.isDragging || !renderer) {
            this.trajectory = [];
            return;
        }

        const velocity = this.power * SLINGSHOT_FORCE_MULTIPLIER;
        const velocityX = Math.cos(this.angle) * velocity;
        const velocityY = Math.sin(this.angle) * velocity;

        // Simulate trajectory
        const points = [];
        let x = this.x;
        let y = this.y;
        let vx = velocityX;
        let vy = velocityY;

        const timestep = 0.016; // 60 FPS
        const gravity = 0.0001;

        for (let i = 0; i < TRAJECTORY_POINTS; i++) {
            points.push({ x, y });

            vx *= 0.999; // Air resistance
            vy += gravity;
            x += vx;
            y += vy;

            // Stop if trajectory goes off screen (roughly)
            if (x > 2000 || y > 1000) break;
        }

        this.trajectory = points;
    }

    update(deltaTime) {
        if (this.currentBird) {
            // Check if bird has settled (low velocity)
            const vx = this.currentBird.velocity.x;
            const vy = this.currentBird.velocity.y;
            const speed = Math.sqrt(vx * vx + vy * vy);

            if (speed < 0.5) {
                // Bird has settled, can launch next one
                this.currentBird = null;
                this.canLaunch = true;
            }
        }

        if (!this.canLaunch) {
            this.launchCooldown -= deltaTime * 1000;
            if (this.launchCooldown <= 0) {
                this.canLaunch = true;
                this.launchCooldown = 0;
            }
        }
    }

    isBirdActive() {
        return this.currentBird !== null;
    }

    resetForNewStage() {
        this.isDragging = false;
        this.currentBird = null;
        this.trajectory = [];
        this.canLaunch = true;
        this.launchCooldown = 0;
    }

    getState() {
        return {
            isDragging: this.isDragging,
            angle: this.angle,
            power: this.power,
            trajectory: this.trajectory,
            currentBird: this.currentBird,
            canLaunch: this.canLaunch
        };
    }

    restoreState(state) {
        this.isDragging = state.isDragging;
        this.angle = state.angle;
        this.power = state.power;
        this.trajectory = state.trajectory;
        this.currentBird = state.currentBird;
        this.canLaunch = state.canLaunch;
    }
}

export default Slingshot;
