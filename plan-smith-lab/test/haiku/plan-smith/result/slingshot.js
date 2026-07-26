// Slingshot input and trajectory handling
const Slingshot = {
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragCurrentX: 0,
    dragCurrentY: 0,
    slingshotX: 100,
    slingshotY: 600,
    projectile: null,
    canShoot: true,
    shootCooldown: 0,

    init: function(x, y) {
        this.slingshotX = x;
        this.slingshotY = y;
        this.setupEventListeners();
    },

    setupEventListeners: function() {
        const canvas = document.getElementById('gameCanvas');

        canvas.addEventListener('mousedown', (e) => {
            if (GameState.currentState !== 'playing' || !this.canShoot) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Check if clicked on slingshot
            if (Math.abs(mouseX - this.slingshotX) < 40 && Math.abs(mouseY - this.slingshotY) < 60) {
                this.isDragging = true;
                this.dragStartX = mouseX;
                this.dragStartY = mouseY;
                this.dragCurrentX = mouseX;
                this.dragCurrentY = mouseY;
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const rect = canvas.getBoundingClientRect();
            this.dragCurrentX = e.clientX - rect.left;
            this.dragCurrentY = e.clientY - rect.top;
        });

        canvas.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;

            const rect = canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;

            this.shoot(endX, endY);
            this.isDragging = false;
        });

        canvas.addEventListener('mouseleave', (e) => {
            this.isDragging = false;
        });
    },

    shoot: function(endX, endY) {
        const dx = this.slingshotX - endX;
        const dy = this.slingshotY - endY;

        // Calculate velocity
        const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 100, 2); // Max power 2
        const angle = Math.atan2(dy, dx);

        const velocity = 15 * power;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        // Create projectile
        this.projectile = Physics.createProjectile(
            this.slingshotX,
            this.slingshotY,
            vx,
            vy
        );

        // Lock slingshot for a bit
        this.canShoot = false;
        this.shootCooldown = 3000; // 3 seconds cooldown
    },

    update: function() {
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
            if (this.shootCooldown <= 0) {
                this.canShoot = true;
            }
        }

        // Check if projectile is still, then allow next shot
        if (this.projectile && !this.canShoot) {
            const v = this.projectile.velocity;
            const speed = Math.sqrt(v.x * v.x + v.y * v.y);
            if (speed < 0.5 && this.projectile.position.y > 650) {
                // Projectile settled
                Physics.removeBody(this.projectile);
                this.projectile = null;
                this.canShoot = true;
            }
        }
    },

    getDragPower: function() {
        if (!this.isDragging) return 0;
        const dx = this.dragCurrentX - this.dragStartX;
        const dy = this.dragCurrentY - this.dragStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return Math.min(dist / 100, 2);
    },

    getDragAngle: function() {
        if (!this.isDragging) return 0;
        const dx = this.dragCurrentX - this.dragStartX;
        const dy = this.dragCurrentY - this.dragStartY;
        return Math.atan2(dy, dx);
    }
};
