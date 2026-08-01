export class UI {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameRef: any;

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, gameRef: any) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.gameRef = gameRef;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    private handleClick(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Pause button (right side)
        if (x > this.canvas.width - 50 && x < this.canvas.width - 10 && y > 10 && y < 50) {
            this.gameRef.pause();
            return;
        }

        // Stage select buttons
        const startY = 150;
        const btnWidth = 150;
        const btnHeight = 50;
        const gap = 20;
        const cols = 5;

        for (let i = 0; i < 10; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const btnX = 50 + col * (btnWidth + gap);
            const btnY = startY + row * (btnHeight + gap);

            if (x > btnX && x < btnX + btnWidth && y > btnY && y < btnY + btnHeight) {
                this.gameRef.selectStage(i + 1);
                return;
            }
        }

        // Pause menu buttons
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Continue button
        if (x > centerX - 100 && x < centerX + 100 && y > centerY - 80 && y < centerY - 20) {
            this.gameRef.resume();
            return;
        }

        // Restart button
        if (x > centerX - 100 && x < centerX + 100 && y > centerY && y < centerY + 60) {
            this.gameRef.restart();
            return;
        }

        // Main menu button
        if (x > centerX - 100 && x < centerX + 100 && y > centerY + 80 && y < centerY + 140) {
            this.gameRef.goToMenu();
            return;
        }

        // Clear menu - next stage
        if (x > centerX - 100 && x < centerX + 100 && y > centerY + 20 && y < centerY + 80) {
            this.gameRef.nextStage();
            return;
        }

        // Fail menu - restart
        if (x > centerX - 100 && x < centerX + 100 && y > centerY - 80 && y < centerY - 20) {
            this.gameRef.restart();
            return;
        }

        // Fail menu - main menu
        if (x > centerX - 100 && x < centerX + 100 && y > centerY && y < centerY + 60) {
            this.gameRef.goToMenu();
            return;
        }
    }

    public renderMenu(canvas: HTMLCanvasElement, clearFn: (ctx: CanvasRenderingContext2D) => void): void {
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Angry Birds', canvas.width / 2, 80);

        // Stage buttons
        const startY = 150;
        const btnWidth = 150;
        const btnHeight = 50;
        const gap = 20;
        const cols = 5;

        for (let i = 0; i < 10; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const btnX = 50 + col * (btnWidth + gap);
            const btnY = startY + row * (btnHeight + gap);

            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Stage ${i + 1}`, btnX + btnWidth / 2, btnY + btnHeight / 2 + 8);
        }
    }

    public renderPauseButton(ctx: CanvasRenderingContext2D): void {
        const btnX = this.canvas.width - 50;
        const btnY = 10;
        const btnWidth = 40;
        const btnHeight = 40;

        ctx.fillStyle = '#333';
        ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);

        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⏸', btnX + btnWidth / 2, btnY + btnHeight / 2 + 8);
    }

    public renderPauseMenu(ctx: CanvasRenderingContext2D): void {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#fff';
        ctx.fillRect(centerX - 150, centerY - 150, 300, 300);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - 150, centerY - 150, 300, 300);

        ctx.fillStyle = '#000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', centerX, centerY - 100);

        // Continue button
        this.drawButton(ctx, centerX - 100, centerY - 80, 200, 50, 'Continue', '#4CAF50');

        // Restart button
        this.drawButton(ctx, centerX - 100, centerY, 200, 50, 'Restart', '#FF9800');

        // Main menu button
        this.drawButton(ctx, centerX - 100, centerY + 80, 200, 50, 'Main Menu', '#F44336');
    }

    public renderClearMenu(ctx: CanvasRenderingContext2D, score: number, stage: number): void {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#fff';
        ctx.fillRect(centerX - 150, centerY - 150, 300, 300);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - 150, centerY - 150, 300, 300);

        ctx.fillStyle = '#000';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Stage Clear!', centerX, centerY - 80);

        ctx.font = 'bold 20px Arial';
        ctx.fillText(`Score: ${score}`, centerX, centerY - 20);

        // Next button
        this.drawButton(ctx, centerX - 100, centerY + 20, 200, 50, 'Next Stage', '#4CAF50');
    }

    public renderFailMenu(ctx: CanvasRenderingContext2D): void {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#fff';
        ctx.fillRect(centerX - 150, centerY - 150, 300, 300);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - 150, centerY - 150, 300, 300);

        ctx.fillStyle = '#000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Failed!', centerX, centerY - 80);

        // Restart button
        this.drawButton(ctx, centerX - 100, centerY - 40, 200, 50, 'Retry', '#FF9800');

        // Main menu button
        this.drawButton(ctx, centerX - 100, centerY + 40, 200, 50, 'Main Menu', '#F44336');
    }

    private drawButton(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string, color: string): void {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, x + width / 2, y + height / 2 + 6);
    }
}
