(function() {
  window.AB = window.AB || {};

  const C = window.AB.CONFIG;
  let bodyIdCounter = 0;

  function speedOf(body) {
    return Math.sqrt(body.vx * body.vx + body.vy * body.vy);
  }

  function createBody(def) {
    const body = {
      id: ++bodyIdCounter,
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
      const density = def.density || 1.0;
      if (body.shape === 'circle') {
        body.mass = (density * Math.PI * body.r * body.r) / 1000;
      } else {
        body.mass = (density * body.w * body.h) / 1000;
      }
      body.invMass = body.mass > 0 ? 1 / body.mass : 0;
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
    if (idx !== -1) {
      world.bodies.splice(idx, 1);
    }
  }

  function wakeBody(body) {
    if (!body.isStatic) {
      body.sleeping = false;
      body.sleepTimer = 0;
    }
  }

  function wakeAll(world) {
    for (const body of world.bodies) {
      if (!body.isStatic) {
        wakeBody(body);
      }
    }
  }

  function effInv(body) {
    if (body.isStatic || body.sleeping) {
      return 0;
    }
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

  function collideCircleBox(circle, box) {
    const left = box.x - box.w / 2;
    const right = box.x + box.w / 2;
    const top = box.y - box.h / 2;
    const bottom = box.y + box.h / 2;

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    const qx = clamp(circle.x, left, right);
    const qy = clamp(circle.y, top, bottom);

    const dx = qx - circle.x;
    const dy = qy - circle.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (circle.x >= left && circle.x <= right && circle.y >= top && circle.y <= bottom) {
      // Circle center is inside box
      const dL = circle.x - left;
      const dR = right - circle.x;
      const dT = circle.y - top;
      const dB = bottom - circle.y;

      const minD = Math.min(dL, dR, dT, dB);
      let nx, ny, pen;

      if (minD === dL) {
        nx = 1; ny = 0; pen = circle.r + dL;
      } else if (minD === dR) {
        nx = -1; ny = 0; pen = circle.r + dR;
      } else if (minD === dT) {
        nx = 0; ny = 1; pen = circle.r + dT;
      } else {
        nx = 0; ny = -1; pen = circle.r + dB;
      }
      return { a: circle, b: box, nx, ny, pen };
    } else {
      // Circle center is outside box
      if (d >= circle.r) return null;
      let nx, ny;
      if (d > 0.0001) {
        nx = dx / d;
        ny = dy / d;
      } else {
        nx = 0;
        ny = -1;
      }
      const pen = circle.r - d;
      return { a: circle, b: box, nx, ny, pen };
    }
  }

  function collideBoxCircle(box, circle) {
    const c = collideCircleBox(circle, box);
    if (c === null) return null;
    // Flip the normal
    return { a: box, b: circle, nx: -c.nx, ny: -c.ny, pen: c.pen };
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
    const h = dt / C.SUBSTEPS;

    for (let substep = 0; substep < C.SUBSTEPS; substep++) {
      // 0. Wake nearby
      for (const m of world.bodies) {
        if (m.isStatic || m.sleeping) continue;
        if (speedOf(m) <= C.WAKE_SPEED) continue;

        const maabb = getAABB(m);
        const wakeAabb = {
          minX: maabb.minX - C.WAKE_MARGIN,
          maxX: maabb.maxX + C.WAKE_MARGIN,
          minY: maabb.minY - C.WAKE_MARGIN,
          maxY: maabb.maxY + C.WAKE_MARGIN
        };

        for (const s of world.bodies) {
          if (!s.sleeping || s.isStatic) continue;
          const saabb = getAABB(s);
          if (!(saabb.maxX < wakeAabb.minX || saabb.minX > wakeAabb.maxX ||
                saabb.maxY < wakeAabb.minY || saabb.minY > wakeAabb.maxY)) {
            wakeBody(s);
          }
        }
      }

      // 1. Gravity
      for (const body of world.bodies) {
        if (body.isStatic || body.sleeping) continue;
        body.vy += C.GRAVITY * h;
      }

      // 2. Collect contacts
      const contacts = [];
      for (let i = 0; i < world.bodies.length; i++) {
        for (let j = i + 1; j < world.bodies.length; j++) {
          const a = world.bodies[i];
          const b = world.bodies[j];

          if ((a.isStatic || a.sleeping) && (b.isStatic || b.sleeping)) {
            continue;
          }

          const c = collide(a, b);
          if (!c) continue;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const vn = rvx * c.nx + rvy * c.ny;
          const s = Math.max(0, -vn);

          // Contact wake
          if ((a.isStatic || a.sleeping) && !b.isStatic && speedOf(b) > C.WAKE_SPEED) {
            if (s > C.WAKE_SPEED) {
              wakeBody(a);
            }
          } else if ((b.isStatic || b.sleeping) && !a.isStatic && speedOf(a) > C.WAKE_SPEED) {
            if (s > C.WAKE_SPEED) {
              wakeBody(b);
            }
          }

          // Bird touch
          if (a.kind === 'bird') a.touched = true;
          if (b.kind === 'bird') b.touched = true;

          // Damage
          if (a.hp !== Infinity) {
            if (s > C.DAMAGE_MIN_SPEED) {
              const base = (s - C.DAMAGE_MIN_SPEED) * C.DAMAGE_FACTOR;
              const massCoeff = b.isStatic ? 1.0 : Math.max(C.DAMAGE_MASS_MIN, Math.min(C.DAMAGE_MASS_MAX, b.mass / a.mass));
              a.pendingDamage += base * massCoeff;
            }
          }
          if (b.hp !== Infinity) {
            if (s > C.DAMAGE_MIN_SPEED) {
              const base = (s - C.DAMAGE_MIN_SPEED) * C.DAMAGE_FACTOR;
              const massCoeff = a.isStatic ? 1.0 : Math.max(C.DAMAGE_MASS_MIN, Math.min(C.DAMAGE_MASS_MAX, a.mass / b.mass));
              b.pendingDamage += base * massCoeff;
            }
          }

          contacts.push(c);
        }
      }

      // 3. Solve velocities
      for (let iter = 0; iter < C.SOLVER_ITERATIONS; iter++) {
        for (const c of contacts) {
          const iA = effInv(c.a);
          const iB = effInv(c.b);
          if (iA + iB === 0) continue;

          const rvx = c.b.vx - c.a.vx;
          const rvy = c.b.vy - c.a.vy;
          const vn = rvx * c.nx + rvy * c.ny;

          if (vn >= 0) continue;

          const e = (-vn < C.RESTITUTION_MIN_SPEED) ? 0 : Math.min(c.a.restitution, c.b.restitution);
          const j = (-(1 + e) * vn) / (iA + iB);

          c.a.vx -= j * c.nx * iA;
          c.a.vy -= j * c.ny * iA;
          c.b.vx += j * c.nx * iB;
          c.b.vy += j * c.ny * iB;

          // Friction
          const rvx2 = c.b.vx - c.a.vx;
          const rvy2 = c.b.vy - c.a.vy;
          const tx = rvx2 - (rvx2 * c.nx + rvy2 * c.ny) * c.nx;
          const ty = rvy2 - (rvx2 * c.nx + rvy2 * c.ny) * c.ny;
          const tl = Math.sqrt(tx * tx + ty * ty);

          if (tl >= 0.000001) {
            const t_nx = tx / tl;
            const t_ny = ty / tl;
            const vt = rvx2 * t_nx + rvy2 * t_ny;
            let jt = -vt / (iA + iB);
            const mu = Math.sqrt(c.a.friction * c.b.friction);
            jt = Math.max(-mu * j, Math.min(mu * j, jt));

            c.a.vx -= jt * t_nx * iA;
            c.a.vy -= jt * t_ny * iA;
            c.b.vx += jt * t_nx * iB;
            c.b.vy += jt * t_ny * iB;
          }
        }
      }

      // 4. Position integration
      for (const body of world.bodies) {
        if (body.isStatic || body.sleeping) continue;

        const speed = speedOf(body);
        if (speed > C.MAX_SPEED) {
          const scale = C.MAX_SPEED / speed;
          body.vx *= scale;
          body.vy *= scale;
        }

        body.x += body.vx * h;
        body.y += body.vy * h;
      }

      // 5. Position correction
      for (const c of contacts) {
        const iA = effInv(c.a);
        const iB = effInv(c.b);
        if (iA + iB === 0) continue;

        const corr = Math.max(c.pen - C.POSITION_SLOP, 0) / (iA + iB) * C.POSITION_PERCENT;
        c.a.x -= c.nx * corr * iA;
        c.a.y -= c.ny * corr * iA;
        c.b.x += c.nx * corr * iB;
        c.b.y += c.ny * corr * iB;
      }
    }

    // Post-step
    // Sleep
    for (const body of world.bodies) {
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

    // Rotate circles for rendering
    for (const body of world.bodies) {
      if (body.shape === 'circle' && !body.sleeping && !body.isStatic) {
        body.angle += (body.vx / body.r) * dt;
      }
    }
  }

  function explode(world, x, y, radius, impulse, maxDv) {
    const result = [];

    for (const body of world.bodies) {
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

      const dv = Math.min((impulse * strength) / body.mass, maxDv);
      wakeBody(body);
      body.vx += dirX * dv;
      body.vy += dirY * dv;

      result.push({ body, strength });
    }

    return result;
  }

  window.AB.Physics = {
    createWorld,
    createBody,
    addBody,
    removeBody,
    speedOf,
    wakeBody,
    wakeAll,
    step,
    explode
  };
})();
