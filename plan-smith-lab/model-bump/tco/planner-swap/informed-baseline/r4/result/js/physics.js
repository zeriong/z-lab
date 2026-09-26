window.AB = window.AB || {};

(function() {
  'use strict';

  let nextBodyId = 1;

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
    if (!body.isStatic) {
      body.sleeping = false;
      body.sleepTimer = 0;
    }
  }

  function wakeAll(world) {
    for (let i = 0; i < world.bodies.length; i++) {
      if (!world.bodies[i].isStatic) {
        wakeBody(world.bodies[i]);
      }
    }
  }

  function createBody(def) {
    const C = AB.CONFIG;
    const body = {
      id: nextBodyId++,
      shape: def.shape || 'box',
      x: def.x || 0,
      y: def.y || 0,
      w: def.w || 0,
      h: def.h || 0,
      r: def.r || 0,
      vx: 0,
      vy: 0,
      restitution: def.restitution || 0,
      friction: def.friction || 0,
      isStatic: def.isStatic || false,
      sleeping: false,
      sleepTimer: 0,
      kind: def.kind || 'block',
      material: def.material || null,
      subtype: def.subtype || null,
      hp: (def.hp !== undefined) ? def.hp : Infinity,
      maxHp: (def.hp !== undefined) ? def.hp : Infinity,
      pendingDamage: 0,
      alive: true,
      touched: false,
      angle: 0
    };

    // Calculate mass
    if (def.isStatic) {
      body.mass = 0;
      body.invMass = 0;
    } else if (body.shape === 'box') {
      body.mass = (def.density || 1.0) * body.w * body.h / 1000;
      body.invMass = 1 / body.mass;
    } else {
      body.mass = (def.density || 1.0) * Math.PI * body.r * body.r / 1000;
      body.invMass = 1 / body.mass;
    }

    return body;
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

  function collideBoxBox(A, B) {
    const dx = B.x - A.x;
    const px = (A.w / 2 + B.w / 2) - Math.abs(dx);
    if (px <= 0) return null;

    const dy = B.y - A.y;
    const py = (A.h / 2 + B.h / 2) - Math.abs(dy);
    if (py <= 0) return null;

    if (px < py) {
      const sign = dx >= 0 ? 1 : -1;
      return { a: A, b: B, nx: sign, ny: 0, pen: px };
    } else {
      const sign = dy >= 0 ? 1 : -1;
      return { a: A, b: B, nx: 0, ny: sign, pen: py };
    }
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

    // Outside
    if (qx !== C.x || qy !== C.y) {
      if (d >= C.r) return null;
      let nx, ny;
      if (d > 0.0001) {
        nx = dx / d;
        ny = dy / d;
      } else {
        nx = 1;
        ny = 0;
      }
      const pen = C.r - d;
      return { a: C, b: R, nx: nx, ny: ny, pen: pen };
    }

    // Inside
    const dL = C.x - left;
    const dR = right - C.x;
    const dT = C.y - top;
    const dB = bottom - C.y;

    let minDist = Math.min(dL, dR, dT, dB);
    let nx, ny, pen;

    if (minDist === dL) {
      nx = 1;
      ny = 0;
      pen = C.r + dL;
    } else if (minDist === dR) {
      nx = -1;
      ny = 0;
      pen = C.r + dR;
    } else if (minDist === dT) {
      nx = 0;
      ny = 1;
      pen = C.r + dT;
    } else {
      nx = 0;
      ny = -1;
      pen = C.r + dB;
    }

    return { a: C, b: R, nx: nx, ny: ny, pen: pen };
  }

  function collide(A, B) {
    if (A.shape === 'box' && B.shape === 'box') {
      return collideBoxBox(A, B);
    } else if (A.shape === 'circle' && B.shape === 'circle') {
      return collideCircleCircle(A, B);
    } else if (A.shape === 'circle' && B.shape === 'box') {
      const c = collideCircleBox(A, B);
      if (c) {
        c.a = A;
        c.b = B;
        c.nx = -c.nx;
        c.ny = -c.ny;
      }
      return c;
    } else if (A.shape === 'box' && B.shape === 'circle') {
      return collideCircleBox(B, A);
    }
    return null;
  }

  function step(world, dt) {
    const C = AB.CONFIG;
    const h = dt / C.SUBSTEPS;

    for (let substep = 0; substep < C.SUBSTEPS; substep++) {
      // 0. Wake nearby
      for (let i = 0; i < world.bodies.length; i++) {
        const M = world.bodies[i];
        if (M.isStatic || M.sleeping) continue;
        if (speedOf(M) <= C.WAKE_SPEED) continue;

        const mAABB = getAABB(M);
        const checkAABB = {
          minX: mAABB.minX - C.WAKE_MARGIN,
          maxX: mAABB.maxX + C.WAKE_MARGIN,
          minY: mAABB.minY - C.WAKE_MARGIN,
          maxY: mAABB.maxY + C.WAKE_MARGIN
        };

        for (let j = 0; j < world.bodies.length; j++) {
          const S = world.bodies[j];
          if (!S.sleeping || S.isStatic) continue;

          const sAABB = getAABB(S);
          if (checkAABB.minX <= sAABB.maxX && checkAABB.maxX >= sAABB.minX &&
              checkAABB.minY <= sAABB.maxY && checkAABB.maxY >= sAABB.minY) {
            wakeBody(S);
          }
        }
      }

      // 1. Gravity
      for (let i = 0; i < world.bodies.length; i++) {
        const body = world.bodies[i];
        if (!body.isStatic && !body.sleeping) {
          body.vy += C.GRAVITY * h;
        }
      }

      // 2. Collect contacts
      const contacts = [];
      for (let i = 0; i < world.bodies.length; i++) {
        for (let j = i + 1; j < world.bodies.length; j++) {
          const A = world.bodies[i];
          const B = world.bodies[j];

          if ((A.isStatic || A.sleeping) && (B.isStatic || B.sleeping)) continue;

          const c = collide(A, B);
          if (!c) continue;

          const rvx = B.vx - A.vx;
          const rvy = B.vy - A.vy;
          const vn = rvx * c.nx + rvy * c.ny;
          const s = Math.max(0, -vn);

          // Contact wake
          if ((A.sleeping && !B.isStatic) || (B.sleeping && !A.isStatic)) {
            if (s > C.WAKE_SPEED || speedOf(A) > C.WAKE_SPEED || speedOf(B) > C.WAKE_SPEED) {
              if (A.sleeping) wakeBody(A);
              if (B.sleeping) wakeBody(B);
            }
          }

          // Mark touched
          if (A.kind === 'bird') A.touched = true;
          if (B.kind === 'bird') B.touched = true;

          // Record damage
          if (A.hp < Infinity) {
            if (s <= C.DAMAGE_MIN_SPEED) {
              // No damage
            } else {
              const base = (s - C.DAMAGE_MIN_SPEED) * C.DAMAGE_FACTOR;
              let massCoeff = B.isStatic ? 1.0 : Math.max(C.DAMAGE_MASS_MIN, Math.min(B.mass / A.mass, C.DAMAGE_MASS_MAX));
              A.pendingDamage += base * massCoeff;
            }
          }

          if (B.hp < Infinity) {
            if (s <= C.DAMAGE_MIN_SPEED) {
              // No damage
            } else {
              const base = (s - C.DAMAGE_MIN_SPEED) * C.DAMAGE_FACTOR;
              let massCoeff = A.isStatic ? 1.0 : Math.max(C.DAMAGE_MASS_MIN, Math.min(A.mass / B.mass, C.DAMAGE_MASS_MAX));
              B.pendingDamage += base * massCoeff;
            }
          }

          contacts.push(c);
        }
      }

      // 3. Solve velocities
      for (let iter = 0; iter < C.SOLVER_ITERATIONS; iter++) {
        for (let k = 0; k < contacts.length; k++) {
          const c = contacts[k];
          const A = c.a;
          const B = c.b;
          const iA = effInv(A);
          const iB = effInv(B);

          if (iA + iB === 0) continue;

          const rvx = B.vx - A.vx;
          const rvy = B.vy - A.vy;
          const vn = rvx * c.nx + rvy * c.ny;

          if (vn >= 0) continue;

          let e = Math.abs(vn) < C.RESTITUTION_MIN_SPEED ? 0 : Math.min(A.restitution, B.restitution);
          const j = -(1 + e) * vn / (iA + iB);

          A.vx -= j * c.nx * iA;
          A.vy -= j * c.ny * iA;
          B.vx += j * c.nx * iB;
          B.vy += j * c.ny * iB;

          // Friction
          const rvx2 = B.vx - A.vx;
          const rvy2 = B.vy - A.vy;
          const vn2 = rvx2 * c.nx + rvy2 * c.ny;
          const tx = rvx2 - vn2 * c.nx;
          const ty = rvy2 - vn2 * c.ny;
          const tl = Math.sqrt(tx * tx + ty * ty);

          if (tl >= 0.000001) {
            const t_nx = tx / tl;
            const t_ny = ty / tl;
            const vt = rvx2 * t_nx + rvy2 * t_ny;
            const jt = -vt / (iA + iB);
            const mu = Math.sqrt(A.friction * B.friction);
            const jt_clamped = Math.max(-mu * j, Math.min(jt, mu * j));

            A.vx -= jt_clamped * t_nx * iA;
            A.vy -= jt_clamped * t_ny * iA;
            B.vx += jt_clamped * t_nx * iB;
            B.vy += jt_clamped * t_ny * iB;
          }
        }
      }

      // 4. Position integrate
      for (let i = 0; i < world.bodies.length; i++) {
        const body = world.bodies[i];
        if (body.isStatic || body.sleeping) continue;

        let speed = speedOf(body);
        if (speed > C.MAX_SPEED) {
          const scale = C.MAX_SPEED / speed;
          body.vx *= scale;
          body.vy *= scale;
        }

        body.x += body.vx * h;
        body.y += body.vy * h;
      }

      // 5. Position correction
      for (let k = 0; k < contacts.length; k++) {
        const c = contacts[k];
        const A = c.a;
        const B = c.b;
        const iA = effInv(A);
        const iB = effInv(B);

        if (iA + iB === 0) continue;

        const corr = Math.max(c.pen - C.POSITION_SLOP, 0) / (iA + iB) * C.POSITION_PERCENT;
        A.x -= c.nx * corr * iA;
        A.y -= c.ny * corr * iA;
        B.x += c.nx * corr * iB;
        B.y += c.ny * corr * iB;
      }
    }

    // Post-step
    // Sleep
    for (let i = 0; i < world.bodies.length; i++) {
      const body = world.bodies[i];
      if (body.isStatic || body.sleeping) continue;

      if (speedOf(body) < C.SLEEP_SPEED) {
        body.sleepTimer += dt;
      } else {
        body.sleepTimer = 0;
      }

      if (body.sleepTimer >= C.SLEEP_TIME) {
        body.sleeping = true;
        body.vx = 0;
        body.vy = 0;
        body.sleepTimer = 0;
      }
    }

    // Circle rotation (visual)
    for (let i = 0; i < world.bodies.length; i++) {
      const body = world.bodies[i];
      if (body.shape === 'circle' && !body.isStatic && !body.sleeping) {
        if (body.r > 0) {
          body.angle += (body.vx / body.r) * dt;
        }
      }
    }
  }

  function explode(world, x, y, radius, impulse, maxDv) {
    const result = [];
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
      wakeBody(body);
      body.vx += dirX * dv;
      body.vy += dirY * dv;

      result.push({ body: body, strength: strength });
    }
    return result;
  }

  AB.Physics = {
    createWorld: createWorld,
    createBody: createBody,
    addBody: addBody,
    removeBody: removeBody,
    step: step,
    speedOf: speedOf,
    wakeBody: wakeBody,
    wakeAll: wakeAll,
    explode: explode
  };
})();
