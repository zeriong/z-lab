class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
    }

    clear() {
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawGame(gameState, physicsEngine) {
        this.clear();

        // 바디 그리기
        const bodies = physicsEngine.engine.world.bodies;

        for (let body of bodies) {
            this.drawBody(body);
        }

        // 드래그 중 궤적 표시
        if (gameState.isAiming && gameState.trajectoryPoints.length > 0) {
            this.drawTrajectory(gameState.trajectoryPoints);
        }

        // 슬링샷 시각화
        this.drawSlingshot(gameState);
    }

    drawBody(body) {
        const angle = body.angle;
        const x = body.position.x;
        const y = body.position.y;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        if (body.label === 'bird') {
            this.drawBird(body);
        } else if (body.label === 'pig') {
            this.drawPig(body);
        } else if (body.label === 'block') {
            this.drawBlock(body);
        } else if (body.label === 'obstacle') {
            this.drawObstacle(body);
        } else if (body.label === 'ground') {
            this.drawGround(body);
        }

        this.ctx.restore();
    }

    drawBird(body) {
        this.ctx.fillStyle = '#ff4444';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, body.circleRadius || 10, 0, Math.PI * 2);
        this.ctx.fill();

        // 눈
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(-3, -2, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(-3, -2, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPig(body) {
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, body.circleRadius || 8, 0, Math.PI * 2);
        this.ctx.fill();

        // 코
        this.ctx.fillStyle = 'pink';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBlock(body) {
        this.ctx.fillStyle = '#8B4513';
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;

        const vertices = body.vertices;
        if (vertices && vertices.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
            for (let i = 1; i < vertices.length; i++) {
                this.ctx.lineTo(vertices[i].x - body.position.x, vertices[i].y - body.position.y);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    drawObstacle(body) {
        this.ctx.fillStyle = '#666666';
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;

        const vertices = body.vertices;
        if (vertices && vertices.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
            for (let i = 1; i < vertices.length; i++) {
                this.ctx.lineTo(vertices[i].x - body.position.x, vertices[i].y - body.position.y);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    drawGround(body) {
        this.ctx.fillStyle = '#228B22';
        this.ctx.strokeStyle = '#1a5f1a';
        this.ctx.lineWidth = 2;

        const vertices = body.vertices;
        if (vertices && vertices.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
            for (let i = 1; i < vertices.length; i++) {
                this.ctx.lineTo(vertices[i].x - body.position.x, vertices[i].y - body.position.y);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    drawTrajectory(trajectoryPoints) {
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        this.ctx.beginPath();
        if (trajectoryPoints.length > 0) {
            this.ctx.moveTo(trajectoryPoints[0].x, trajectoryPoints[0].y);
            for (let i = 1; i < trajectoryPoints.length; i++) {
                this.ctx.lineTo(trajectoryPoints[i].x, trajectoryPoints[i].y);
            }
            this.ctx.stroke();
        }

        this.ctx.setLineDash([]);

        // 궤적 점 표시
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        for (let point of trajectoryPoints) {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawSlingshot(gameState) {
        if (!gameState.stageData) return;

        const slingPos = gameState.stageData.slingshot;
        const x = slingPos.x;
        const y = slingPos.y;

        // 슬링샷 받침대
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x - 20, y, 40, 80);

        // 슬링샷 밴드
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 10, y);
        this.ctx.lineTo(x, y + 30);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(x + 10, y);
        this.ctx.lineTo(x, y + 30);
        this.ctx.stroke();

        // 새 위치 표시
        if (gameState.bodies.bird) {
            const bird = gameState.bodies.bird;
            if (!gameState.birdFired) {
                // 아직 발사되지 않음 - 슬링샷에 위치
                this.ctx.fillStyle = '#ff4444';
                this.ctx.beginPath();
                this.ctx.arc(x, y + 30, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    updateHUD(gameState) {
        document.getElementById('score').textContent = `Score: ${gameState.score}`;
        const stageNum = gameState.currentStage + 1;
        const movesRemain = Math.max(0, gameState.getRemainingMoves());
        document.getElementById('stageInfo').textContent =
            `Stage ${stageNum}/10 | Moves: ${movesRemain}/${gameState.stageData?.maxMoves || 0}`;
    }
}
