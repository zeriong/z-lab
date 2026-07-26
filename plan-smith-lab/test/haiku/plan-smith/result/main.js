// Main game initialization and loop
const Game = {
    init: function() {
        console.log('Initializing game...');

        // Initialize systems
        Renderer.init('gameCanvas');
        Physics.init();
        Physics.createStaticGround();
        Slingshot.init(100, 600);
        Collision.setup();
        UI.init();

        // Start main menu
        GameState.setState('mainMenu');

        // Start game loop
        this.loop();
    },

    loop: function() {
        // Update
        Physics.update();
        Slingshot.update();

        if (GameState.currentState === 'playing' || GameState.currentState === 'paused') {
            GameState.checkClear();
        }

        // Render
        Renderer.render();

        // Draw slingshot
        if (GameState.currentState === 'playing' || GameState.currentState === 'paused') {
            const power = Slingshot.getDragPower();
            const angle = Slingshot.getDragAngle();
            Renderer.drawSlingshot(Slingshot.slingshotX, Slingshot.slingshotY, angle, power);

            // Draw trajectory
            if (Slingshot.isDragging && power > 0) {
                const velocity = 15 * power;
                const vx = Math.cos(angle) * velocity;
                const vy = Math.sin(angle) * velocity;
                Renderer.drawTrajectory(Slingshot.slingshotX, Slingshot.slingshotY, vx, vy);
            }
        }

        UI.updateStageInfo();

        requestAnimationFrame(() => this.loop());
    }
};

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
