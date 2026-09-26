(function() {
  window.AB = window.AB || {};

  let nextBodyId = 1;

  AB.Physics = {
    createWorld: function() {
      return { bodies: [] };
    },

    addBody: function(world, body) {
      world.bodies.push(body);
    },

    removeBody: function(world, body) {
      const idx = world.bodies.indexOf(body);
      if (idx !== -1) {
        world.bodies.splice(idx, 1);
      }
    },

    createBody: function(def) {
      const cfg = AB.CONFIG;
      const w = def.w || 0;
      const h = def.h || 0;
      const r = def.r || 0;
      const isStatic = def.isStatic || false;

      let mass;
      if (isStatic) {
        mass = 0;
      } else if (def.shape === 'circle') {
        mass = (def.density || 1) * Math.PI * r * r / 1000;
      } else {
        mass = (def.density || 1) * w * h / 1000;
      }

      return {
        id: nextBodyId++,
        shape: def.shape || 'box',
        x: def.x || 0,
        y: def.y || 0,
        w: w,
        h: h,
        r: r,
        vx: 0,
        vy: 0,
        mass: mass,
        invMass: mass > 0 ? 1 / mass : 0,
        restitution: def.restitution || 0,
        friction: def.friction || 0,
        isStatic: isStatic,
        sleeping: false,
        sleepTimer: 0,
        kind: def.kind || 'block',
        material: def.material || null,
        subtype: def.subtype || null,
        hp: def.hp !== undefined ? def.hp : Infinity,
        maxHp: def.hp !== undefined ? def.hp : Infinity,
        pendingDamage: 0,
        alive: true,
        touched: false,
        angle: 0
      };
    },

    speedOf: function(body) {
      return Math.sqrt(body.vx * body.vx + body.vy * body.vy);
    },

    wakeBody: function(body) {
      if (body.isStatic) return;
      body.sleeping = false;
      body.sleepTimer = 0;
    },

    wakeAll: function(world) {
      for (let i = 0; i < world.bodies.length; i++) {
        AB.Physics.wakeBody(world.bodies[i]);
      }
    },

    step: function(world, dt) {
      const cfg = AB.CONFIG;
      const h = dt / cfg.SUBSTEPS;

      for (let sub = 0; sub < cfg.SUBSTEPS; sub++) {
        // Step 0: Wake nearby
        const awake = world.bodies.filter(b => !b.isStatic && !b.sleeping && AB.Physics.speedOf(b) > cfg.WAKE_SPEED);
        for (let a = 0; a < awake.length; a++) {
          const M = awake[a];
          const aabb = getAABB(M);
          const expanded = {
            minX: aabb.minX - cfg.WAKE_MARGIN,
            maxX: aabb.maxX + cfg.WAKE_MARGIN,
            minY: aabb.minY - cfg.WAKE_MARGIN,
            maxY: aabb.maxY + cfg.WAKE_MARGIN
          };
          for (let s = 0; s < world.bodies.length; s++) {
            const S = world.bodies[s];
            if (S.sleeping && !S.isStatic) {
              const saabb = getAABB(S);
              if (!(expanded.maxX < saabb.minX || expanded.minX > saabb.maxX ||
                    expanded.maxY < saabb.minY || expanded.minY > saabb.maxY)) {
                AB.Physics.wakeBody(S);
              }
            }
          }
        }

        // Step 1: Gravity
        for (let i = 0; i < world.bodies.length; i++) {
          const body = world.bodies[i];
          if (!body.isStatic && !body.sleeping) {
            body.vy += cfg.GRAVITY * h;
          }
        }

        // Step 2: Collect contacts
        const contacts = [];
        for (let i = 0; i < world.bodies.length; i++) {
          for (let j = i + 1; j < world.bodies.length; j++) {
            const A = world.bodies[i];
            const B = world.bodies[j];

            if ((A.isStatic || A.sleeping) && (B.isStatic || B.sleeping)) {
              continue;
            }

            const c = collide(A, B);
            if (!c) continue;

            const rv = { x: B.vx - A.vx, y: B.vy - A.vy };
            const vn = rv.x * c.nx + rv.y * c.ny;
            const s = Math.max(0, -vn);

            // Wake on contact
            if ((A.isStatic || A.sleeping) !== (B.isStatic || B.sleeping)) {
              const wake = A.sleeping ? B : A;
              const sleep = A.sleeping ? A : B;
              if (s > cfg.WAKE_SPEED || AB.Physics.speedOf(wake) > cfg.WAKE_SPEED) {
                AB.Physics.wakeBody(sleep);
              }
            }

            // Mark bird touched
            if (A.kind === 'bird') A.touched = true;
            if (B.kind === 'bird') B.touched = true;

            // Damage
            if (A.hp < Infinity) {
              let dmg = 0;
              if (s > cfg.DAMAGE_MIN_SPEED) {
                const base = (s - cfg.DAMAGE_MIN_SPEED) * cfg.DAMAGE_FACTOR;
                let massFactor;
                if (B.isStatic) {
                  massFactor = 1.0;
                } else {
                  massFactor = Math.max(cfg.DAMAGE_MASS_MIN, Math.min(cfg.DAMAGE_MASS_MAX, B.mass / A.mass));
                }
                dmg = base * massFactor;
              }
              A.pendingDamage += dmg;
            }
            if (B.hp < Infinity) {
              let dmg = 0;
              if (s > cfg.DAMAGE_MIN_SPEED) {
                const base = (s - cfg.DAMAGE_MIN_SPEED) * cfg.DAMAGE_FACTOR;
                let massFactor;
                if (A.isStatic) {
                  massFactor = 1.0;
                } else {
                  massFactor = Math.max(cfg.DAMAGE_MASS_MIN, Math.min(cfg.DAMAGE_MASS_MAX, A.mass / B.mass));
                }
                dmg = base * massFactor;
              }
              B.pendingDamage += dmg;
            }

            contacts.push(c);
          }
        }

        // Step 3: Solve velocities
        for (let iter = 0; iter < cfg.SOLVER_ITERATIONS; iter++) {
          for (let ci = 0; ci < contacts.length; ci++) {
            const c = contacts[ci];
            const A = c.a;
            const B = c.b;

            const iA = effInv(A);
            const iB = effInv(B);
            if (iA + iB === 0) continue;

            const rv = { x: B.vx - A.vx, y: B.vy - A.vy };
            const vn = rv.x * c.nx + rv.y * c.ny;
            if (vn >= 0) continue;

            let e = vn > -cfg.RESTITUTION_MIN_SPEED ? 0 : Math.min(A.restitution, B.restitution);
            const j = -(1 + e) * vn / (iA + iB);

            A.vx -= j * c.nx * iA;
            A.vy -= j * c.ny * iA;
            B.vx += j * c.nx * iB;
            B.vy += j * c.ny * iB;

            // Friction
            const rv2 = { x: B.vx - A.vx, y: B.vy - A.vy };
            const vn2 = rv2.x * c.nx + rv2.y * c.ny;
            const tx = { x: rv2.x - vn2 * c.nx, y: rv2.y - vn2 * c.ny };
            const tl = Math.sqrt(tx.x * tx.x + tx.y * tx.y);
            if (tl >= 0.000001) {
              tx.x /= tl;
              tx.y /= tl;
              const vt = rv2.x * tx.x + rv2.y * tx.y;
              let jt = -vt / (iA + iB);
              const mu = Math.sqrt(A.friction * B.friction);
              jt = Math.max(-mu * j, Math.min(mu * j, jt));
              A.vx -= jt * tx.x * iA;
              A.vy -= jt * tx.y * iA;
              B.vx += jt * tx.x * iB;
              B.vy += jt * tx.y * iB;
            }
          }
        }

        // Step 4: Position integration
        for (let i = 0; i < world.bodies.length; i++) {
          const body = world.bodies[i];
          if (body.isStatic || body.sleeping) continue;

          const speed = AB.Physics.speedOf(body);
          if (speed > cfg.MAX_SPEED) {
            const scale = cfg.MAX_SPEED / speed;
            body.vx *= scale;
            body.vy *= scale;
          }

          body.x += body.vx * h;
          body.y += body.vy * h;
        }

        // Step 5: Position correction
        for (let ci = 0; ci < contacts.length; ci++) {
          const c = contacts[ci];
          const A = c.a;
          const B = c.b;

          const iA = effInv(A);
          const iB = effInv(B);
          if (iA + iB === 0) continue;

          const corr = Math.max(c.pen - cfg.POSITION_SLOP, 0) / (iA + iB) * cfg.POSITION_PERCENT;
          A.x -= c.nx * corr * iA;
          A.y -= c.ny * corr * iA;
          B.x += c.nx * corr * iB;
          B.y += c.ny * corr * iB;
        }
      }

      // Post-step: sleep & rotation
      for (let i = 0; i < world.bodies.length; i++) {
        const body = world.bodies[i];
        if (body.isStatic || body.sleeping) continue;

        if (AB.Physics.speedOf(body) < cfg.SLEEP_SPEED) {
          body.sleepTimer += dt;
        } else {
          body.sleepTimer = 0;
        }

        if (body.sleepTimer >= cfg.SLEEP_TIME) {
          body.sleeping = true;
          body.vx = 0;
          body.vy = 0;
          body.sleepTimer = 0;
        }

        if (body.shape === 'circle') {
          body.angle += (body.vx / body.r) * dt;
        }
      }
    },

    explode: function(world, x, y, radius, impulse, maxDv) {
      const results = [];
      for (let i = 0; i < world.bodies.length; i++) {
        const body = world.bodies[i];
        if (body.isStatic) continue;

        const dx = body.x - x;
        const dy = body.y - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= radius) continue;

        const strength = 1 - d / radius;
        let dirX, dirY;
        if (d > 0.001) {
          dirX = dx / d;
          dirY = dy / d;
        } else {
          dirX = 0;
          dirY = -1;
        }

        const dv = Math.min(impulse * strength / body.mass, maxDv);
        AB.Physics.wakeBody(body);
        body.vx += dirX * dv;
        body.vy += dirY * dv;

        results.push({ body: body, strength: strength });
      }
      return results;
    }
  };

  function effInv(body) {
    if (body.isStatic || body.sleeping) return 0;
    return body.invMass;
  }

  function getAABB(body) {
    return {
      minX: body.x - body.w / 2,
      maxX: body.x + body.w / 2,
      minY: body.y - body.h / 2,
      maxY: body.y + body.h / 2
    };
  }

  function collide(A, B) {
    if (A.shape === 'box' && B.shape === 'box') {
      return collideBoxBox(A, B);
    } else if (A.shape === 'circle' && B.shape === 'circle') {
      return collideCircleCircle(A, B);
    } else if (A.shape === 'circle' && B.shape === 'box') {
      const c = collideCircleBox(A, B);
      if (!c) return null;
      return { a: A, b: B, nx: c.nx, ny: c.ny, pen: c.pen };
    } else if (A.shape === 'box' && B.shape === 'circle') {
      const c = collideCircleBox(B, A);
      if (!c) return null;
      return { a: A, b: B, nx: -c.nx, ny: -c.ny, pen: c.pen };
    }
    return null;
  }

  function collideBoxBox(A, B) {
    const dx = B.x - A.x;
    const px = (A.w / 2 + B.w / 2) - Math.abs(dx);
    if (px <= 0) return null;

    const dy = B.y - A.y;
    const py = (A.h / 2 + B.h / 2) - Math.abs(dy);
    if (py <= 0) return null;

    let nx, ny, pen;
    if (px < py) {
      nx = Math.sign(dx) || 1;
      ny = 0;
      pen = px;
    } else {
      nx = 0;
      ny = Math.sign(dy) || 1;
      pen = py;
    }

    return { a: A, b: B, nx: nx, ny: ny, pen: pen };
  }

  function collideCircleCircle(A, B) {
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d >= A.r + B.r) return null;

    let nx, ny;
    if (d > 0.0001) {
      nx = dx / d;
      ny = dy / d;
    } else {
      nx = 0;
      ny = 1;
    }

    const pen = A.r + B.r - d;
    return { a: A, b: B, nx: nx, ny: ny, pen: pen };
  }

  function collideCircleBox(C, R) {
    const left = R.x - R.w / 2;
    const right = R.x + R.w / 2;
    const top = R.y - R.h / 2;
    const bottom = R.y + R.h / 2;

    const qx = Math.max(left, Math.min(C.x, right));
    const qy = Math.max(top, Math.min(C.y, bottom));

    const dx = qx - C.x;
    const dy = qy - C.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (qx !== C.x || qy !== C.y) {
      // Circle outside
      if (d >= C.r) return null;
      const nx = dx / d;
      const ny = dy / d;
      const pen = C.r - d;
      return { nx: nx, ny: ny, pen: pen };
    } else {
      // Circle inside
      const dL = C.x - left;
      const dR = right - C.x;
      const dT = C.y - top;
      const dB = bottom - C.y;

      let minD = dL;
      let nx = 1, ny = 0;
      if (dR < minD) { minD = dR; nx = -1; ny = 0; }
      if (dT < minD) { minD = dT; nx = 0; ny = 1; }
      if (dB < minD) { minD = dB; nx = 0; ny = -1; }

      const pen = C.r + minD;
      return { nx: nx, ny: ny, pen: pen };
    }
  }
})();
