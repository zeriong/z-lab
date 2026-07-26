// Canvas renderer for the game
const Renderer = {
    canvas: null,
    ctx: null,
    scale: 1,

    init: function(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        return this.ctx;
    },

    clear: function() {
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    drawBody: function(body) {
        const ctx = this.ctx;
        const color = body.color || '#8B4513';

        ctx.fillStyle = color;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        if (body.isCircle) {
            // Draw circle
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, body.circleRadius || 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            // Draw polygon
            const vertices = body.vertices;
            if (vertices && vertices.length > 0) {
                ctx.beginPath();
                ctx.moveTo(vertices[0].x, vertices[0].y);
                for (let i = 1; i < vertices.length; i++) {
                    ctx.lineTo(vertices[i].x, vertices[i].y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
    },

    drawSlingshot: function(x, y, angle, power) {
        const ctx = this.ctx;
        const length = 60;
        const bandX1 = x + 15;
        const bandX2 = x - 15;
        const bandY = y + 30;

        // Draw wooden stand
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - 20, y, 40, 40);

        // Draw slingshot bands
        const pullX = x + Math.cos(angle) * length * power;
        const pullY = y + Math.sin(angle) * length * power;

        // Band 1
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bandX1, y);
        ctx.lineTo(pullX, pullY);
        ctx.stroke();

        // Band 2
        ctx.beginPath();
        ctx.moveTo(bandX2, y);
        ctx.lineTo(pullX, pullY);
        ctx.stroke();

        // Draw projectile
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(pullX, pullY, 8, 0, Math.PI * 2);
        ctx.fill();
    },

    drawTrajectory: function(startX, startY, vx, vy) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        let x = startX;
        let y = startY;

        ctx.beginPath();
        ctx.moveTo(x, y);

        // Draw trajectory using physics
        let currentVx = vx;
        let currentVy = vy;
        const gravity = 1;
        const dt = 1000 / 60 / 1000; // Convert to seconds

        for (let i = 0; i < 100; i++) {
            x += currentVx * dt;
            y += currentVy * dt;
            currentVy += gravity * dt;

            if (y > 700) break; // Stop at ground level
            ctx.lineTo(x, y);
        }

        ctx.stroke();
        ctx.setLineDash([]);
    },

    render: function() {
        this.clear();

        // Draw all bodies
        Physics.bodies.forEach(body => {
            if (body.label !== 'ground') {
                this.drawBody(body);
            }
        });
    }
};
