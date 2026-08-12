export class Renderer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.width = canvasElement.width;
        this.height = canvasElement.height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawCircle(x, y, radius, fillColor = '#FF6B6B', strokeColor = null, strokeWidth = 2) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        if (strokeColor) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.stroke();
        }
    }

    drawRectangle(x, y, w, h, angle, fillColor = '#8B4513', strokeColor = null, strokeWidth = 2) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(-w / 2, -h / 2, w, h);

        if (strokeColor) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.strokeRect(-w / 2, -h / 2, w, h);
        }
        this.ctx.restore();
    }

    drawBird(body, type = 'red') {
        const colorMap = {
            red: '#FF6B6B',
            blue: '#4A90E2',
            yellow: '#FFD700',
            black: '#333333'
        };
        const color = colorMap[type] || colorMap.red;
        this.drawCircle(body.position.x, body.position.y, 15, color, '#333', 2);
    }

    drawPig(body) {
        this.drawCircle(body.position.x, body.position.y, 12, '#90EE90', '#333', 2);
    }

    drawBlock(body) {
        const materialColors = {
            wood: '#8B4513',
            stone: '#A9A9A9',
            ice: '#E0FFFF'
        };
        const color = materialColors[body.material] || materialColors.wood;
        this.drawRectangle(body.position.x, body.position.y, body.w, body.h, body.angle, color, '#333', 2);
    }

    drawGround(body) {
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(body.position.x - 500, body.position.y - 10, 1000, 20);
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(body.position.x - 500, body.position.y - 10, 1000, 20);
    }

    drawTrajectory(points, color = 'rgba(255, 200, 0, 0.5)') {
        if (points.length < 2) return;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw dots along trajectory
        this.ctx.fillStyle = color;
        for (let i = 0; i < points.length; i += 3) {
            this.ctx.beginPath();
            this.ctx.arc(points[i].x, points[i].y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawSlingshot(startX, startY, dragX, dragY) {
        // Draw slingshot base
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(startX - 15, startY - 30);
        this.ctx.lineTo(startX, startY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(startX + 15, startY - 30);
        this.ctx.lineTo(startX, startY);
        this.ctx.stroke();

        // Draw aiming line
        this.ctx.strokeStyle = 'rgba(255, 100, 0, 0.7)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(dragX, dragY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw bird at drag position
        this.drawCircle(dragX, dragY, 15, '#FF6B6B', '#333', 2);
    }

    drawUI(gameState, canvas) {
        // HUD updates are handled by HTML elements
        // This is kept for any additional canvas-based UI if needed
    }

    drawPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawLevelComplete() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawGame(gameState, physicsEngine) {
        this.clear();

        // Draw ground
        if (gameState.bodies.ground) {
            this.drawGround(gameState.bodies.ground);
        }

        // Draw blocks
        gameState.bodies.blocks.forEach(block => {
            this.drawBlock(block);
        });

        // Draw pigs
        gameState.bodies.pigs.forEach(pig => {
            this.drawPig(pig);
        });

        // Draw bird
        if (gameState.bodies.bird) {
            this.drawBird(gameState.bodies.bird, gameState.bodies.bird.birdType || 'red');
        }

        // Draw aiming trajectory during drag
        if (gameState.isAiming && gameState.trajectoryPoints.length > 0) {
            this.drawTrajectory(gameState.trajectoryPoints, 'rgba(255, 200, 0, 0.6)');
        }

        // Draw slingshot during aiming
        if (gameState.isAiming && gameState.dragStart && gameState.dragCurrent) {
            this.drawSlingshot(
                gameState.dragStart.x,
                gameState.dragStart.y,
                gameState.dragCurrent.x,
                gameState.dragCurrent.y
            );
        } else if (!gameState.isAiming && gameState.bodies.bird && !gameState.birdInFlight) {
            // Draw slingshot when bird is at rest
            this.drawSlingshot(100, 500, gameState.bodies.bird.position.x, gameState.bodies.bird.position.y);
        }
    }

    drawMenu() {
        this.clear();
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Angry Birds', this.width / 2, 150);

        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = '#666';
        this.ctx.fillText('A Physics-Based Slingshot Game', this.width / 2, 200);
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
    }
}
