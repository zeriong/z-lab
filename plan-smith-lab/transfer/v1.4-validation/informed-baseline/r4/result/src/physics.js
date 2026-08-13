// Physics engine
const P = {
  createWorld: () => ({
    bodies: [],
    nextId: 0
  }),

  addBox: (world, x, y, hw, hh, density, e, mu, isStatic, mat, kind) => {
    const mass = isStatic ? Infinity : (2 * hw * 2 * hh * density) / 1000;
    const body = {
      id: world.nextId++,
      shape: 'box',
      x, y,
      vx: 0, vy: 0,
      hw, hh,
      mass,
      invMass: isStatic ? 0 : 1 / mass,
      e, mu,
      isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp: MAT[mat].hp,
      maxHp: MAT[mat].hp,
      kind,
      mat,
      dead: false,
      angle: 0
    };
    world.bodies.push(body);
    return body;
  },

  addCircle: (world, x, y, r, density, e, mu, isStatic, mat, kind) => {
    const mass = isStatic ? Infinity : (Math.PI * r * r * density) / 1000;
    const body = {
      id: world.nextId++,
      shape: 'circle',
      x, y,
      vx: 0, vy: 0,
      r,
      mass,
      invMass: isStatic ? 0 : 1 / mass,
      e, mu,
      isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp: MAT[mat].hp,
      maxHp: MAT[mat].hp,
      kind,
      mat,
      dead: false,
      angle: 0
    };
    world.bodies.push(body);
    return body;
  },

  step: (world, dt) => {
    const bodies = world.bodies;

    // 1) Integrate (skip static/sleeping)
    for (let b of bodies) {
      if (b.isStatic || b.sleeping) continue;
      b.vy += C.GRAVITY * dt;
      b.vx -= b.vx * C.LINEAR_DAMP * dt;
      b.vy -= b.vy * C.LINEAR_DAMP * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    // 2) Collect contacts (O(n²))
    const contacts = [];
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        if (a.isStatic && b.isStatic) continue;
        if (a.sleeping && b.sleeping) continue;

        let contact = null;
        if (a.shape === 'circle' && b.shape === 'circle') {
          contact = P._collideCircleCircle(a, b);
        } else if (a.shape === 'circle' && b.shape === 'box') {
          contact = P._collideCircleBox(a, b);
        } else if (a.shape === 'box' && b.shape === 'circle') {
          contact = P._collideCircleBox(b, a);
          if (contact) {
            contact.nx *= -1;
            contact.ny *= -1;
            [contact.a, contact.b] = [contact.b, contact.a];
          }
        } else if (a.shape === 'box' && b.shape === 'box') {
          contact = P._collideBoxBox(a, b);
        }

        if (contact) {
          contacts.push(contact);
        }
      }
    }

    // 3) Damage calculation (once before iteration)
    for (let c of contacts) {
      const rvn = -((c.b.vx - c.a.vx) * c.nx + (c.b.vy - c.a.vy) * c.ny);
      if (rvn > C.DMG_MIN_SPEED) {
        P._applyDamage(c.a, c.b, rvn);
        P._applyDamage(c.b, c.a, rvn);
      }
    }

    // 4) Impulse iteration
    for (let iter = 0; iter < C.SOLVER_ITER; iter++) {
      for (let c of contacts) {
        P._resolveImpulse(c);
      }
    }

    // 5) Position correction (once after)
    for (let c of contacts) {
      const inv = c.a.invMass + c.b.invMass;
      if (inv === 0) continue;
      const corr = Math.max(c.depth - C.PEN_SLOP, 0) / inv * C.PEN_PERCENT;
      c.a.x -= corr * c.a.invMass * c.nx;
      c.a.y -= corr * c.a.invMass * c.ny;
      c.b.x += corr * c.b.invMass * c.nx;
      c.b.y += corr * c.b.invMass * c.ny;
    }

    // 6) Sleep update
    for (let b of bodies) {
      if (b.isStatic) continue;
      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (speed < C.SLEEP_SPEED) {
        b.sleepTimer += dt;
        if (b.sleepTimer > C.SLEEP_TIME) {
          b.sleeping = true;
          b.vx = b.vy = 0;
        }
      } else {
        b.sleepTimer = 0;
      }
    }

    // Wake nearby bodies on death
    const deadBodies = bodies.filter(b => b.dead);
    for (let db of deadBodies) {
      for (let b of bodies) {
        if (b === db || b.isStatic) continue;
        const d = U.dist(db, b);
        if (d < 120) {
          b.sleeping = false;
          b.sleepTimer = 0;
        }
      }
    }

    // 7) Remove dead bodies
    world.bodies = bodies.filter(b => !b.dead);
  },

  _collideCircleCircle: (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.r + b.r;

    if (d >= minDist) return null;

    if (d === 0) {
      return { a, b, nx: 0, ny: -1, depth: minDist };
    }

    const nx = dx / d;
    const ny = dy / d;
    const depth = minDist - d;
    return { a, b, nx, ny, depth };
  },

  _collideCircleBox: (circle, box) => {
    const qx = U.clamp(circle.x, box.x - box.hw, box.x + box.hw);
    const qy = U.clamp(circle.y, box.y - box.hh, box.y + box.hh);

    if (qx === circle.x && qy === circle.y) {
      // Circle center inside box
      const dx = box.hw - Math.abs(circle.x - box.x);
      const dy = box.hh - Math.abs(circle.y - box.y);

      let nx, ny, depth;
      if (dx < dy) {
        nx = U.sign(circle.x - box.x);
        ny = 0;
        depth = dx + circle.r;
      } else {
        nx = 0;
        ny = U.sign(circle.y - box.y);
        depth = dy + circle.r;
      }
      return { a: circle, b: box, nx, ny, depth };
    } else {
      // Circle center outside box
      const dx = circle.x - qx;
      const dy = circle.y - qy;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d >= circle.r) return null;

      const nx = dx / d;
      const ny = dy / d;
      const depth = circle.r - d;
      return { a: circle, b: box, nx, ny, depth };
    }
  },

  _collideBoxBox: (a, b) => {
    const ox = (a.hw + b.hw) - Math.abs(b.x - a.x);
    const oy = (a.hh + b.hh) - Math.abs(b.y - a.y);

    if (ox <= 0 || oy <= 0) return null;

    let nx, ny, depth;
    if (ox < oy) {
      nx = U.sign(b.x - a.x);
      ny = 0;
      depth = ox;
    } else {
      nx = 0;
      ny = U.sign(b.y - a.y);
      depth = oy;
    }
    return { a, b, nx, ny, depth };
  },

  _resolveImpulse: (c) => {
    const a = c.a;
    const b = c.b;

    const rvn = (b.vx - a.vx) * c.nx + (b.vy - a.vy) * c.ny;
    if (rvn > 0) return; // Already separating

    const inv = a.invMass + b.invMass;
    if (inv === 0) return;

    let e = Math.min(a.e, b.e);
    if (Math.abs(rvn) < 60) e = 0; // Low-speed restitution suppression

    const j = -(1 + e) * rvn / inv;
    a.vx -= j * c.nx * a.invMass;
    a.vy -= j * c.ny * a.invMass;
    b.vx += j * c.nx * b.invMass;
    b.vy += j * c.ny * b.invMass;

    // Friction
    const tx = -c.ny;
    const ty = c.nx;
    const rvt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
    let jt = -rvt / inv;
    const mu = Math.sqrt(a.mu * b.mu);
    jt = U.clamp(jt, -Math.abs(j) * mu, Math.abs(j) * mu);
    a.vx -= jt * tx * a.invMass;
    a.vy -= jt * ty * a.invMass;
    b.vx += jt * tx * b.invMass;
    b.vy += jt * ty * b.invMass;
  },

  _applyDamage: (self, other, vn) => {
    const otherMassEff = other.isStatic ? (self.mass * C.STATIC_MASS_FACTOR) : other.mass;
    const ratio = Math.min(C.DMG_MASS_CAP, otherMassEff / self.mass);
    const dmg = (vn - C.DMG_MIN_SPEED) * C.DMG_SCALE * ratio;
    if (self.hp !== Infinity) {
      self.hp -= dmg;
      if (self.hp <= 0) {
        self.dead = true;
      }
    }
  },

  queryRadius: (world, x, y, r) => {
    return world.bodies.filter(b => {
      const d = U.dist({ x, y }, b);
      return d < r;
    });
  }
};
