import { GameState, Block, Pig, Bird, Stage, EffectState } from './types';

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    slingshot_x: number = 100;
    slingshot_y: number = 500;
    ground_y: number = 600;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.setupCanvasSize();
        window.addEventListener('resize', () => this.setupCanvasSize());
    }

    private setupCanvasSize(): void {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.slingshot_y = this.canvas.height - 100;
        this.ground_y = this.canvas.height - 50;
    }

    drawGame(gameState: GameState, stage: Stage | null, effects: EffectState): void {
        this.ctx.fillStyle = '#E0F6FF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (stage) {
            // Draw background
            this.drawBackground(stage);

            // Draw ground
            this.drawGround();

            // Draw blocks
            gameState.blocks.forEach(block => {
                if (!block.destroying) {
                    this.drawBlock(block);
                }
            });

            // Draw pigs
            gameState.pigs.forEach(pig => {
                this.drawPig(pig);
            });

            // Draw slingshot
            this.drawSlingshot();

            // Draw effects
            effects.animations.forEach(anim => {
                this.drawEffect(anim);
            });
        }
    }

    private drawBackground(stage: Stage): void {
        // Simple gradient background for now
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F6FF');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.ground_y);
    }

    private drawGround(): void {
        this.ctx.fillStyle = '#8B7355';
        this.ctx.fillRect(0, this.ground_y, this.canvas.width, this.canvas.height - this.ground_y);

        // Grass
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.ground_y - 10, this.canvas.width, 10);
    }

    drawBlock(block: Block): void {
        const colors: { [key: string]: string } = {
            'wood': '#8B4513',
            'glass': '#87CEEB',
            'concrete': '#808080'
        };

        this.ctx.fillStyle = colors[block.type] || '#8B4513';
        this.ctx.fillRect(block.x, block.y, block.width, block.height);

        // Border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(block.x, block.y, block.width, block.height);

        // Health indicator
        if (block.health < block.max_health) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            const healthWidth = (block.width * block.health) / block.max_health;
            this.ctx.fillRect(block.x, block.y, healthWidth, block.height);
        }
    }

    drawPig(pig: Pig): void {
        this.ctx.fillStyle = '#90EE90';
        this.ctx.beginPath();
        this.ctx.arc(pig.x + pig.width / 2, pig.y + pig.height / 2, pig.width / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(pig.x + pig.width / 3, pig.y + pig.height / 3, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(pig.x + (pig.width * 2) / 3, pig.y + pig.height / 3, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Snout
        this.ctx.fillStyle = '#FFB6C1';
        this.ctx.beginPath();
        this.ctx.arc(pig.x + pig.width / 2, pig.y + (pig.height * 2) / 3, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBird(bird: Bird): void {
        const colors: { [key: string]: string } = {
            'basic': '#FF0000',
            'heavy': '#8B0000',
            'fast': '#FFD700'
        };

        this.ctx.fillStyle = colors[bird.type] || '#FF0000';
        this.ctx.beginPath();
        this.ctx.arc(bird.x + bird.width / 2, bird.y + bird.height / 2, bird.width / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Eye
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(bird.x + (bird.width * 3) / 4, bird.y + bird.height / 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawSlingshot(): void {
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 4;

        // Base
        this.ctx.beginPath();
        this.ctx.moveTo(this.slingshot_x - 15, this.slingshot_y);
        this.ctx.lineTo(this.slingshot_x + 15, this.slingshot_y);
        this.ctx.stroke();

        // Left arm
        this.ctx.beginPath();
        this.ctx.moveTo(this.slingshot_x - 10, this.slingshot_y);
        this.ctx.lineTo(this.slingshot_x - 10, this.slingshot_y - 60);
        this.ctx.stroke();

        // Right arm
        this.ctx.beginPath();
        this.ctx.moveTo(this.slingshot_x + 10, this.slingshot_y);
        this.ctx.lineTo(this.slingshot_x + 10, this.slingshot_y - 60);
        this.ctx.stroke();

        // Rubber band (will be drawn from input handler when dragging)
        this.ctx.fillStyle = 'rgba(139, 69, 19, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(this.slingshot_x, this.slingshot_y - 30, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawSlinghotPreview(start_x: number, start_y: number, end_x: number, end_y: number): void {
        // Draw trajectory arc preview
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        const dx = end_x - start_x;
        const dy = end_y - start_y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Simple parabolic arc preview
        this.ctx.beginPath();
        this.ctx.moveTo(start_x, start_y);

        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const x = start_x + distance * Math.cos(angle) * t;
            const y = start_y + distance * Math.sin(angle) * t + (t * t * 100);
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawRubberBand(start_x: number, start_y: number, end_x: number, end_y: number): void {
        this.ctx.strokeStyle = '#FF69B4';
        this.ctx.lineWidth = 3;

        // Left strap
        this.ctx.beginPath();
        this.ctx.moveTo(start_x - 10, start_y - 60);
        this.ctx.lineTo(end_x, end_y);
        this.ctx.stroke();

        // Right strap
        this.ctx.beginPath();
        this.ctx.moveTo(start_x + 10, start_y - 60);
        this.ctx.lineTo(end_x, end_y);
        this.ctx.stroke();

        // Bird at the end
        if (end_x !== start_x || end_y !== start_y - 30) {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(end_x, end_y, 10, 0, Math.PI * 2);
            this.ctx.fill();

            // Eye
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(end_x + 5, end_y - 3, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawEffect(anim: any): void {
        if (anim.type === 'destruction') {
            const progress = anim.progress;
            if (progress < 1) {
                this.ctx.fillStyle = `rgba(139, 69, 19, ${1 - progress})`;
                this.ctx.beginPath();
                this.ctx.arc(anim.x, anim.y, 20 * (1 - progress), 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else if (anim.type === 'score') {
            const progress = anim.progress;
            this.ctx.fillStyle = `rgba(255, 215, 0, ${1 - progress})`;
            this.ctx.font = '24px bold Arial';
            this.ctx.fillText('+10', anim.x, anim.y - progress * 50);
        }
    }

    clearCanvas(): void {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getSlingshotPosition(): { x: number; y: number } {
        return { x: this.slingshot_x, y: this.slingshot_y };
    }

    getSlingshotZone(): { x: number; y: number; width: number; height: number } {
        return {
            x: this.slingshot_x - 80,
            y: this.slingshot_y - 100,
            width: 160,
            height: 100
        };
    }
}
