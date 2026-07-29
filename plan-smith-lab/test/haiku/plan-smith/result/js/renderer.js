import { GAME_WIDTH, GAME_HEIGHT, DEFAULT_CAMERA, ENTITY_TYPE } from './constants.js';

class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = GAME_WIDTH;
        this.height = GAME_HEIGHT;
        this.camera = { ...DEFAULT_CAMERA };

        this.canvas.width = GAME_WIDTH;
        this.canvas.height = GAME_HEIGHT;
    }

    setCamera(x, y, zoom = 1) {
        this.camera.x = x;
        this.camera.y = y;
        this.camera.zoom = zoom;
    }

    worldToScreen(x, y) {
        const sx = (x - this.camera.x) * this.camera.zoom + this.width / 2;
        const sy = (y - this.camera.y) * this.camera.zoom + this.height / 2;
        return { x: sx, y: sy };
    }

    clear() {
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.3)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawBody(body, label) {
        const pos = this.worldToScreen(body.position.x, body.position.y);
        this.ctx.save();
        this.ctx.translate(pos.x, pos.y);
        this.ctx.rotate(body.angle);

        // Draw based on entity type
        if (label === ENTITY_TYPE.PIG) {
            this.drawPig();
        } else if (label === ENTITY_TYPE.BIRD) {
            this.drawBird();
        } else if (label.includes('wood')) {
            this.drawWoodBlock(body);
        } else if (label.includes('stone')) {
            this.drawStoneBlock(body);
        } else if (label.includes('ice')) {
            this.drawIceBlock(body);
        } else if (label === ENTITY_TYPE.GROUND) {
            this.drawGround(body);
        } else if (body.circleRadius) {
            this.drawCircle(body);
        } else {
            this.drawRectangle(body);
        }

        this.ctx.restore();
    }

    drawPig() {
        // Draw pig (green circle with eyes)
        this.ctx.fillStyle = '#92c47d';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(-6, -4, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(6, -4, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupils
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(-6, -4, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(6, -4, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Snout
        this.ctx.fillStyle = '#a4c869';
        this.ctx.beginPath();
        this.ctx.arc(0, 5, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBird() {
        // Draw bird (red/black circle)
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // Eye
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(4, -3, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupil
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(5, -3, 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Beak
        this.ctx.fillStyle = '#f39c12';
        this.ctx.beginPath();
        this.ctx.moveTo(8, -1);
        this.ctx.lineTo(12, -2);
        this.ctx.lineTo(8, 1);
        this.ctx.fill();
    }

    drawWoodBlock(body) {
        const vertices = body.vertices;
        if (vertices && vertices.length > 0) {
            this.ctx.fillStyle = '#8b6914';
            this.ctx.beginPath();
            this.ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
            for (let i = 1; i < vertices.length; i++) {
                this.ctx.lineTo(vertices[i].x - body.position.x, vertices[i].y - body.position.y);
            }
            this.ctx.closePath();
            this.ctx.fill();
        } else {
            // Fallback for rectangles without vertices info
            const width = body.circleRadius ? body.circleRadius * 2 : 50;
            const height = body.circleRadius ? body.circleRadius * 2 : 10;
            this.ctx.fillStyle = '#8b6914';
            this.ctx.fillRect(-width / 2, -height / 2, width, height);
        }

        this.ctx.strokeStyle = '#5d4609';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-25, -5, 50, 10);
    }

    drawStoneBlock(body) {
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.fillRect(-25, -25, 50, 50);
        this.ctx.strokeStyle = '#7f8c8d';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-25, -25, 50, 50);
    }

    drawIceBlock(body) {
        this.ctx.fillStyle = '#b3e5fc';
        this.ctx.fillRect(-20, -20, 40, 40);
        this.ctx.strokeStyle = '#81d4fa';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-20, -20, 40, 40);
    }

    drawGround(body) {
        this.ctx.fillStyle = '#8b7355';
        this.ctx.fillRect(-600, -10, 1200, 20);
    }

    drawCircle(body) {
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, body.circleRadius || 12, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawRectangle(body) {
        this.ctx.fillStyle = '#3498db';
        const width = 50;
        const height = 50;
        this.ctx.fillRect(-width / 2, -height / 2, width, height);
    }

    drawTrajectory(points) {
        if (points.length < 2) return;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();

        const startPoint = this.worldToScreen(points[0].x, points[0].y);
        this.ctx.moveTo(startPoint.x, startPoint.y);

        for (let i = 1; i < points.length; i++) {
            const point = this.worldToScreen(points[i].x, points[i].y);
            this.ctx.lineTo(point.x, point.y);
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw trajectory points
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < points.length; i += 10) {
            const point = this.worldToScreen(points[i].x, points[i].y);
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawSlingshot(x, y, angle, power) {
        const pos = this.worldToScreen(x, y);

        // Draw slingshot base
        this.ctx.fillStyle = '#5d4609';
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw slingshot arms
        const armLength = 30;
        const armSpread = 15;

        this.ctx.strokeStyle = '#5d4609';
        this.ctx.lineWidth = 3;

        // Left arm
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x - armSpread, pos.y);
        this.ctx.lineTo(pos.x - armSpread + Math.cos(angle) * armLength, pos.y - Math.sin(angle) * armLength);
        this.ctx.stroke();

        // Right arm
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x + armSpread, pos.y);
        this.ctx.lineTo(pos.x + armSpread + Math.cos(angle) * armLength, pos.y - Math.sin(angle) * armLength);
        this.ctx.stroke();

        // Draw tension indicator
        if (power > 0) {
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, power, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawUI(currentStage, pigs, launched, maxLaunches) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText(`Stage: ${currentStage}`, 20, 30);
        this.ctx.fillText(`Pigs: ${pigs}`, 20, 60);
        this.ctx.fillText(`Launched: ${launched}/${maxLaunches}`, 20, 90);
    }
}

export default Renderer;
