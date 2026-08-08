import { GameState, GameStateEnum } from './types';

export type UICallback = (event: UIEvent) => void;

export interface UIEvent {
    type: 'play_clicked' | 'resume_clicked' | 'restart_clicked' | 'menu_clicked' | 'next_stage_clicked' | 'retry_clicked';
}

export class UIManager {
    private container: HTMLDivElement;
    private callbacks: UICallback[] = [];

    constructor() {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) {
            throw new Error('Game container not found');
        }

        this.container = gameContainer as HTMLDivElement;
    }

    showMenu(): void {
        this.clearOverlays();

        const overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        overlay.id = 'menu-overlay';

        const content = document.createElement('div');
        content.className = 'menu-content';

        const title = document.createElement('h1');
        title.textContent = 'Angry Birds';

        const button = document.createElement('button');
        button.className = 'menu-button';
        button.textContent = 'Play';
        button.addEventListener('click', () => {
            this.emit({ type: 'play_clicked' });
        });

        content.appendChild(title);
        content.appendChild(button);
        overlay.appendChild(content);
        this.container.appendChild(overlay);
    }

    showPauseOverlay(): void {
        this.clearOverlays();

        const overlay = document.createElement('div');
        overlay.className = 'pause-overlay';
        overlay.id = 'pause-overlay';

        const content = document.createElement('div');
        content.className = 'pause-content';

        const title = document.createElement('h2');
        title.textContent = 'Paused';

        const buttons = document.createElement('div');
        buttons.className = 'pause-buttons';

        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'pause-button';
        resumeBtn.textContent = 'Resume';
        resumeBtn.addEventListener('click', () => {
            this.emit({ type: 'resume_clicked' });
        });

        const restartBtn = document.createElement('button');
        restartBtn.className = 'pause-button restart';
        restartBtn.textContent = 'Restart';
        restartBtn.addEventListener('click', () => {
            this.emit({ type: 'restart_clicked' });
        });

        const menuBtn = document.createElement('button');
        menuBtn.className = 'pause-button menu';
        menuBtn.textContent = 'Return to Menu';
        menuBtn.addEventListener('click', () => {
            this.emit({ type: 'menu_clicked' });
        });

        buttons.appendChild(resumeBtn);
        buttons.appendChild(restartBtn);
        buttons.appendChild(menuBtn);

        content.appendChild(title);
        content.appendChild(buttons);
        overlay.appendChild(content);
        this.container.appendChild(overlay);
    }

    showClearOverlay(stars: number, score: number, stage: number, totalStages: number): void {
        this.clearOverlays();

        const overlay = document.createElement('div');
        overlay.className = 'clear-overlay';
        overlay.id = 'clear-overlay';

        const content = document.createElement('div');
        content.className = 'clear-content';

        const title = document.createElement('h2');
        title.textContent = 'Stage Clear!';

        const starsDiv = document.createElement('div');
        starsDiv.className = 'stars';
        starsDiv.textContent = '★'.repeat(stars);

        const scoreDiv = document.createElement('div');
        scoreDiv.textContent = `Score: ${score}`;

        const buttons = document.createElement('div');
        buttons.className = 'clear-buttons';

        if (stage < totalStages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'clear-button';
            nextBtn.textContent = 'Next Stage';
            nextBtn.addEventListener('click', () => {
                this.emit({ type: 'next_stage_clicked' });
            });
            buttons.appendChild(nextBtn);
        }

        const menuBtn = document.createElement('button');
        menuBtn.className = 'clear-button';
        menuBtn.textContent = 'Return to Menu';
        menuBtn.addEventListener('click', () => {
            this.emit({ type: 'menu_clicked' });
        });
        buttons.appendChild(menuBtn);

        content.appendChild(title);
        content.appendChild(starsDiv);
        content.appendChild(scoreDiv);
        content.appendChild(buttons);
        overlay.appendChild(content);
        this.container.appendChild(overlay);
    }

    showFailOverlay(): void {
        this.clearOverlays();

        const overlay = document.createElement('div');
        overlay.className = 'clear-overlay';
        overlay.id = 'fail-overlay';

        const content = document.createElement('div');
        content.className = 'clear-content';

        const title = document.createElement('h2');
        title.textContent = 'Try Again';

        const buttons = document.createElement('div');
        buttons.className = 'clear-buttons';

        const retryBtn = document.createElement('button');
        retryBtn.className = 'clear-button';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', () => {
            this.emit({ type: 'retry_clicked' });
        });

        const menuBtn = document.createElement('button');
        menuBtn.className = 'clear-button';
        menuBtn.textContent = 'Return to Menu';
        menuBtn.addEventListener('click', () => {
            this.emit({ type: 'menu_clicked' });
        });

        buttons.appendChild(retryBtn);
        buttons.appendChild(menuBtn);

        content.appendChild(title);
        content.appendChild(buttons);
        overlay.appendChild(content);
        this.container.appendChild(overlay);
    }

    showHUD(gameState: GameState, stage: any): void {
        let hud = document.getElementById('hud') as HTMLDivElement;
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'hud';
            hud.className = 'hud';
            this.container.appendChild(hud);
        }

        const stageName = stage?.name || 'Stage';
        const birds = gameState.birds_available - gameState.birds_used;

        hud.innerHTML = `
            <div class="hud-item">Stage: ${gameState.current_stage} - ${stageName}</div>
            <div class="hud-item">Birds: ${birds}/${gameState.birds_available}</div>
            <div class="hud-item">Score: ${gameState.score}</div>
        `;

        // Ensure pause button exists
        let pauseBtn = document.querySelector('.pause-btn') as HTMLButtonElement;
        if (!pauseBtn) {
            pauseBtn = document.createElement('button');
            pauseBtn.className = 'pause-btn';
            pauseBtn.textContent = '⏸';
            pauseBtn.addEventListener('click', () => {
                this.emit({ type: 'menu_clicked' });
            });
            this.container.appendChild(pauseBtn);
        }
    }

    hideHUD(): void {
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.display = 'none';
        }
    }

    private clearOverlays(): void {
        const overlays = this.container.querySelectorAll('[id$="-overlay"]');
        overlays.forEach(o => o.remove());
    }

    subscribe(callback: UICallback): void {
        this.callbacks.push(callback);
    }

    private emit(event: UIEvent): void {
        this.callbacks.forEach(cb => cb(event));
    }
}
