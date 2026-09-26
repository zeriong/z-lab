(function() {
  window.AB = window.AB || {};

  AB.Slingshot = {
    dragging: false,
    dragX: AB.CONFIG.SLING_X,
    dragY: AB.CONFIG.SLING_Y,

    reset: function() {
      AB.Slingshot.dragging = false;
      AB.Slingshot.dragX = AB.CONFIG.SLING_X;
      AB.Slingshot.dragY = AB.CONFIG.SLING_Y;
    },

    cancel: function() {
      AB.Slingshot.reset();
    },

    beginDrag: function(x, y, radius) {
      const cfg = AB.CONFIG;
      const dx = x - cfg.SLING_X;
      const dy = y - cfg.SLING_Y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= cfg.SLING_GRAB_RADIUS) {
        AB.Slingshot.dragging = true;
        AB.Slingshot.updateDrag(x, y, radius);
        return true;
      }
      return false;
    },

    updateDrag: function(x, y, radius) {
      if (!AB.Slingshot.dragging) return;

      const cfg = AB.CONFIG;
      let dx = x - cfg.SLING_X;
      let dy = y - cfg.SLING_Y;
      let len = Math.sqrt(dx * dx + dy * dy);

      if (len > cfg.SLING_MAX_PULL) {
        const scale = cfg.SLING_MAX_PULL / len;
        dx *= scale;
        dy *= scale;
      }

      AB.Slingshot.dragX = cfg.SLING_X + dx;
      AB.Slingshot.dragY = Math.min(cfg.SLING_Y + dy, cfg.GROUND_Y - radius - 2);
    },

    getPull: function() {
      const cfg = AB.CONFIG;
      const px = cfg.SLING_X - AB.Slingshot.dragX;
      const py = cfg.SLING_Y - AB.Slingshot.dragY;
      const len = Math.sqrt(px * px + py * py);
      return { px: px, py: py, len: len };
    },

    getLaunchVelocity: function() {
      const cfg = AB.CONFIG;
      const pull = AB.Slingshot.getPull();
      return {
        vx: pull.px * cfg.LAUNCH_SCALE,
        vy: pull.py * cfg.LAUNCH_SCALE
      };
    },

    release: function() {
      if (!AB.Slingshot.dragging) return null;

      const cfg = AB.CONFIG;
      const pull = AB.Slingshot.getPull();

      if (pull.len < cfg.SLING_MIN_PULL) {
        AB.Slingshot.reset();
        return null;
      }

      const vel = AB.Slingshot.getLaunchVelocity();
      const result = {
        x: AB.Slingshot.dragX,
        y: AB.Slingshot.dragY,
        vx: vel.vx,
        vy: vel.vy
      };

      AB.Slingshot.reset();
      return result;
    },

    getBirdPos: function() {
      return {
        x: AB.Slingshot.dragX,
        y: AB.Slingshot.dragY
      };
    },

    predict: function() {
      if (!AB.Slingshot.dragging) return [];

      const cfg = AB.CONFIG;
      const pull = AB.Slingshot.getPull();
      if (pull.len < cfg.SLING_MIN_PULL) return [];

      const vel = AB.Slingshot.getLaunchVelocity();
      const points = [];

      for (let k = 1; k <= cfg.TRAJ_DOT_COUNT; k++) {
        const t = k * cfg.TRAJ_DOT_INTERVAL;
        const px = AB.Slingshot.dragX + vel.vx * t;
        const py = AB.Slingshot.dragY + vel.vy * t + 0.5 * cfg.GRAVITY * t * t;

        if (py > cfg.GROUND_Y || px > cfg.WORLD_W) {
          break;
        }

        points.push({ x: px, y: py });
      }

      return points;
    }
  };
})();
