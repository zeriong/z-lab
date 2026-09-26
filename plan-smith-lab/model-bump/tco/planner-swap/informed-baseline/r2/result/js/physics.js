window.AB = window.AB || {};

(function() {
  'use strict';

  let bodyCounter = 0;

  function createBody(def) {
    def = def || {};
    const body = {
      id: ++bodyCounter,
      shape: def.shape || 'box',
      x: def.x || 0,
      y: def.y || 0,
      w: def.w || 0,
      h: def.h || 0,
      r: def.r || 0,
      vx: 0,
      vy: 0,
      mass: 0,
      invMass: 0,
      restitution: def.restitution !== undefined ? def.restitution : 0.3,
      friction: def.friction !== undefined ? def.friction : 0.5,
      isStatic: def.isStatic || false,
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

    // Calculate mass
    if (body.isStatic) {
      body.mass = 0;
      body.invMass = 0;
    } else {
      if (body.shape === 'box') {
        body.mass = def.density * body.w * body.h / 1000;
      } else {
        body.mass = def.density * Math.PI * body.r * body.r / 1000;
      }
      body.invMass = body.mass > 0 ? 1 / body.mass : 0;
    }

    // For circles, set w and h to 2r for AABB calculations
    if (body.shape === 'circle') {
      body.w = body.r * 2;
      body.h = body.r * 2;
    }

    return body;
  }

  function createWorld() {
    return { bodies: [] };
  }

  function addBody(world, body) {
    world.bodies.push(body);
  }

  function removeBody(world, body) {
    const idx = world.bodies.indexOf(body);
    if (idx >= 0) {
      world.bodies.splice(idx, 1);
    }
  }

  function speedOf(body) {
    return Math.sqrt(body.vx * body.vx + body.vy * body.vy);
  }

  function wakeBody(body) {
    if (body.isStatic) return;
    body.sleeping = false;
    body.sleepTimer = 0;
  }

  function wakeAll(world) {
    for (let i = 0; i < world.bodies.length; i++) {
      if (!world.bodies[i].isStatic) {
        wakeBody(world.bodies[i]);
      }
    }
  }

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

  function collideBoxBox(a, b) {
    const dx = b.x - a.x;
    const px = (a.w / 2 + b.w / 2) - Math.abs(dx);
    if (px <= 0) return null;

    const dy = b.y - a.y;
    const py = (a.h / 2 + b.h / 2) - Math.abs(dy);
    if (py <= 0) return null;

    if (px < py) {
      const sign = dx >= 0 ? 1 : -1;
      return { a, b, nx: sign, ny: 0, pen: px };
    } else {
      const sign = dy >= 0 ? 1 : -1;
      return { a, b, nx: 0, ny: sign, pen: py };
    }
  }

  function collideCircleCircle(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d >= a.r + b.r) return null;

    let nx, ny;
    if (d > 0.0001) {
      nx = dx / d;
      ny = dy / d;
    } else {
      nx = 0;
      ny = 1;
    }

    const pen = a.r + b.r - d;
    return { a, b, nx, ny, pen };
  }

  function collideCircleBox(c, r) {
    const left = r.x - r.w / 2;
    const right = r.x + r.w / 2;
    const top = r.y - r.h / 2;
    const bottom = r.y + r.h / 2;

    const clamp = (v, min, max) => v < min ? min : v > max ? max : v;
    const qx = clamp(c.x, left, right);
    const qy = clamp(c.y, top, bottom);

    const dx = qx - c.x;
    const dy = qy - c.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    // Circle center is outside the rectangle
    if (qx !== c.x || qy !== c.y) {
      if (d >= c.r) return null;
      const nx = dx / d;
      const ny = dy / d;
      const pen = c.r - d;
      return { a: c, b: r, nx, ny, pen };
    }

    // Circle center is inside the rectangle
    const dL = c.x - left;
    const dR = right - c.x;
    const dT = c.y - top;
    const dB = bottom - c.y;

    const distances = [
      { d: dL, nx: 1, ny: 0 },
      { d: dR, nx: -1, ny: 0 },
      { d: dT, nx: 0, ny: 1 },
      { d: dB, nx: 0, ny: -1 }
    ];

    let min = distances[0];
    for (let i = 1; i < 4; i++) {
      if (distances[i].d < min.d) min = distances[i];
    }

    const pen = c.r + min.d;
    return { a: c, b: r, nx: min.nx, ny: min.ny, pen };
  }

  function collideBoxCircle(r, c) {
    const result = collideCircleBox(c, r);
    if (result === null) return null;
    // Flip the normal and swap a/b
    return { a: r, b: c, nx: -result.nx, ny: -result.ny, pen: result.pen };
  }

  function collide(a, b) {
    if (a.shape === 'box' && b.shape === 'box') {
      return collideBoxBox(a, b);
    } else if (a.shape === 'circle' && b.shape === 'circle') {
      return collideCircleCircle(a, b);
    } else if (a.shape === 'circle' && b.shape === 'box') {
      return collideCircleBox(a, b);
    } else if (a.shape === 'box' && b.shape === 'circle') {
      return collideBoxCircle(a, b);
    }
    return null;
  }

  function step(world, dt) {
    const C = AB.CONFIG;
    const h = dt / C.SUBSTEPS;

    for (let substep = 0; substep < C.SUBSTEPS; substep++) {
      // 0. Near-wake bodies
      const fastBodies = [];
      for (let i = 0; i < world.bodies.length; i++) {
        const b = world.bodies[i];
        if (!b.isStatic && !b.sleeping && speedOf(b) > C.WAKE_SPEED) {
          fastBodies.push(b);
        }
      }

      for (let i = 0; i < fastBodies.length; i++) {
        const m = fastBodies[i];
        const mAABB = getAABB(m);
        const margin = C.WAKE_MARGIN;
        const expandedAABB = {
          minX: mAABB.minX - margin,
          maxX: mAABB.maxX + margin,
          minY: mAABB.minY - margin,
          maxY: mAABB.maxY + margin
        };

        for (let j = 0; j < world.bodies.length; j++) {
          const s = world.bodies[j];
          if (s.sleeping && !s.isStatic) {
            const sAABB = getAABB(s);
            if (!(expandedAABB.maxX < sAABB.minX || expandedAABB.minX > sAABB.maxX ||
                  expandedAABB.maxY < sAABB.minY || expandedAABB.minY > sAABB.maxY)) {
              wakeBody(s);
            }
          }
        }
      }

      // 1. Gravity
      for (let i = 0; i < world.bodies.length; i++) {
        const b = world.bodies[i];
        if (!b.isStatic && !b.sleeping) {
          b.vy += C.GRAVITY * h;
        }
      }

      // 2. Collect contacts
      const contacts = [];
      for (let i = 0; i < world.bodies.length; i++) {
        for (let j = i + 1; j < world.bodies.length; j++) {
          const a = world.bodies[i];
          const b = world.bodies[j];

          // Skip if both are immovable
          if ((a.isStatic || a.sleeping) && (b.isStatic || b.sleeping)) {
            continue;
          }

          const c = collide(a, b);
          if (!c) continue;

          // Calculate relative velocity and closing speed
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const vn = rvx * c.nx + rvy * c.ny;
          const s = Math.max(0, -vn);

          // Contact wake-up
          if ((a.sleeping && !a.isStatic) || (b.sleeping && !b.isStatic)) {
            const aSpeed = speedOf(a);
            const bSpeed = speedOf(b);
            if (s > C.WAKE_SPEED || (a.sleeping === false && aSpeed > C.WAKE_SPEED) ||
                (b.sleeping === false && bSpeed > C.WAKE_SPEED)) {
              if (a.sleeping && !a.isStatic) wakeBody(a);
              if (b.sleeping && !b.isStatic) wakeBody(b);
            }
          }

          // Mark bird contact
          if (a.kind === 'bird') a.touched = true;
          if (b.kind === 'bird') b.touched = true;

          // Apply damage
          if (a.hp !== Infinity) {
            if (s > C.DAMAGE_MIN_SPEED) {
              const base = (s - C.DAMAGE_MIN_SPEED) * C.DAMAGE_FACTOR;
              const massFactor = b.isStatic ? 1.0 : Math.max(C.DAMAGE_MASS_MIN, Math.min(C.DAMAGE_MASS_MAX, b.mass / a.mass));
              a.pendingDamage += base * massFactor;
            }
          }

          if (b.hp !== Infinity) {
            if (s > C.DAMAGE_MIN_SPEED) {
              const base = (s - C.DAMAGE_MIN_SPEED) * C.DAMAGE_FACTOR;
              const massFactor = a.isStatic ? 1.0 : Math.max(C.DAMAGE_MASS_MIN, Math.min(C.DAMAGE_MASS_MAX, a.mass / b.mass));
              b.pendingDamage += base * massFactor;
            }
          }

          contacts.push(c);
        }
      }

      // 3. Solve velocities
      for (let iter = 0; iter < C.SOLVER_ITERATIONS; iter++) {
        for (let i = 0; i < contacts.length; i++) {
          const c = contacts[i];
          const a = c.a;
          const b = c.b;
          const iA = effInv(a);
          const iB = effInv(b);

          if (iA + iB === 0) continue;

          // Recalculate relative velocity
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const vn = rvx * c.nx + rvy * c.ny;

          if (vn >= 0) continue; // Separating

          // Restitution
          const e = (-vn < C.RESTITUTION_MIN_SPEED) ? 0 : Math.min(a.restitution, b.restitution);
          const j = -(1 + e) * vn / (iA + iB);

          a.vx -= j * c.nx * iA;
          a.vy -= j * c.ny * iA;
          b.vx += j * c.nx * iB;
          b.vy += j * c.ny * iB;

          // Friction
          const tx = rvx - vn * c.nx;
          const ty = rvy - vn * c.ny;
          const tl = Math.sqrt(tx * tx + ty * ty);

          if (tl >= 0.000001) {
            const tux = tx / tl;
            const tuy = ty / tl;
            const vt = rvx * tux + rvy * tuy;
            const jt = -vt / (iA + iB);
            const mu = Math.sqrt(a.friction * b.friction);
            const jt_clamped = Math.max(-mu * j, Math.min(mu * j, jt));

            a.vx -= jt_clamped * tux * iA;
            a.vy -= jt_clamped * tuy * iA;
            b.vx += jt_clamped * tux * iB;
            b.vy += jt_clamped * tuy * iB;
          }
        }
      }

      // 4. Position integration
      for (let i = 0; i < world.bodies.length; i++) {
        const b = world.bodies[i];
        if (!b.isStatic && !b.sleeping) {
          const speed = speedOf(b);
          if (speed > C.MAX_SPEED) {
            const factor = C.MAX_SPEED / speed;
            b.vx *= factor;
            b.vy *= factor;
          }
          b.x += b.vx * h;
          b.y += b.vy * h;
        }
      }

      // 5. Position correction
      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        const a = c.a;
        const b = c.b;
        const iA = effInv(a);
        const iB = effInv(b);

        if (iA + iB === 0) continue;

        const corr = Math.max(c.pen - C.POSITION_SLOP, 0) / (iA + iB) * C.POSITION_PERCENT;
        a.x -= c.nx * corr * iA;
        a.y -= c.ny * corr * iA;
        b.x += c.nx * corr * iB;
        b.y += c.ny * corr * iB;
      }
    }

    // Post-step: Sleep and rotation
    for (let i = 0; i < world.bodies.length; i++) {
      const b = world.bodies[i];
      if (!b.isStatic && !b.sleeping) {
        if (speedOf(b) < C.SLEEP_SPEED) {
          b.sleepTimer += dt;
        } else {
          b.sleepTimer = 0;
        }

        if (b.sleepTimer >= C.SLEEP_TIME) {
          b.sleeping = true;
          b.vx = 0;
          b.vy = 0;
          b.sleepTimer = 0;
        }

        // Rotation for visual
        if (b.shape === 'circle' && b.r > 0) {
          b.angle += (b.vx / b.r) * dt;
        }
      }
    }
  }

  function explode(world, x, y, radius, impulse, maxDv) {
    const result = [];

    for (let i = 0; i < world.bodies.length; i++) {
      const body = world.bodies[i];
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
      wakeBody(body);
      body.vx += dirX * dv;
      body.vy += dirY * dv;

      result.push({ body, strength });
    }

    return result;
  }

  AB.Physics = {
    createBody,
    createWorld,
    addBody,
    removeBody,
    speedOf,
    wakeBody,
    wakeAll,
    step,
    explode
  };
})();
