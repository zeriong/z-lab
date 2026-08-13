// Physics engine (§5)
const P = {
  createWorld() {
    return { bodies: [], nextId: 0 };
  },

  addBox(world, x, y, hw, hh, { isStatic = false, e = 0.2, mu = 0.5, hp = 60, mat = 'wood', kind = 'block' } = {}) {
    const density = isStatic ? 0 : MAT[mat].density;
    const mass = isStatic ? Infinity : (2 * hw * 2 * hh * density) / 1000;
    const body = {
      id: world.nextId++,
      shape: 'box',
      x, y,
      vx: 0, vy: 0,
      hw, hh,
      mass,
      invMass: isStatic ? 0 : 1 / mass,
      e: isStatic ? 0.2 : e,
      mu,
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

  addCircle(world, x, y, r, { isStatic = false, e = 0.2, mu = 0.5, hp = Infinity, mat = 'bird', kind = 'bird' } = {}) {
    const density = isStatic ? 0 : MAT[mat].density;
    const mass = isStatic ? Infinity : (Math.PI * r * r * density) / 1000;
    const body = {
      id: world.nextId++,
      shape: 'circle',
      x, y,
      vx: 0, vy: 0,
      r,
      mass,
      invMass: isStatic ? 0 : 1 / mass,
      e,
      mu,
      isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp,
      maxHp: hp,
      kind,
      mat,
      dead: false,
      angle: 0
    };
    world.bodies.push(body);
    return body;
  },

  step(world, dt) {
    // 1) Integrate (skip static & sleeping)
    for (let body of world.bodies) {
      if (body.isStatic || body.sleeping) continue;
      body.vy += C.GRAVITY * dt;
      body.vx -= body.vx * C.LINEAR_DAMP * dt;
      body.vy -= body.vy * C.LINEAR_DAMP * dt;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
    }

    // 2) Collect contacts
    const contacts = [];
    for (let i = 0; i < world.bodies.length; i++) {
      for (let j = i + 1; j < world.bodies.length; j++) {
        const a = world.bodies[i];
        const b = world.bodies[j];
        if (a.isStatic && b.isStatic) continue;
        if (a.sleeping && b.sleeping) continue;

        const contact = P._getContact(a, b);
        if (contact) contacts.push(contact);
      }
    }

    // 3) Damage calculation (once before solver)
    for (let contact of contacts) {
      const { a, b, nx, ny } = contact;
      const rvn = -((b.vx - a.vx) * nx + (b.vy - a.vy) * ny);
      if (rvn > C.DMG_MIN_SPEED) {
        P._applyDamage(a, b, rvn);
        P._applyDamage(b, a, rvn);
      }
    }

    // 4) Impulse solver iterations
    for (let iter = 0; iter < C.SOLVER_ITER; iter++) {
      for (let contact of contacts) {
        P._solveContact(contact);
      }
    }

    // 5) Position correction (once after solver)
    for (let contact of contacts) {
      P._correctPosition(contact);
    }

    // 6) Sleep update
    for (let body of world.bodies) {
      if (body.isStatic) continue;
      const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
      if (speed * speed < C.SLEEP_SPEED * C.SLEEP_SPEED) {
        body.sleepTimer += dt;
      } else {
        body.sleepTimer = 0;
      }
      if (body.sleepTimer > C.SLEEP_TIME) {
        body.sleeping = true;
        body.vx = 0;
        body.vy = 0;
      }
    }

    // Wake up logic during contact collection
    for (let contact of contacts) {
      const { a, b } = contact;
      if (!a.sleeping && Math.sqrt(a.vx * a.vx + a.vy * a.vy) >= C.WAKE_SPEED) {
        b.sleeping = false;
        b.sleepTimer = 0;
      }
      if (!b.sleeping && Math.sqrt(b.vx * b.vx + b.vy * b.vy) >= C.WAKE_SPEED) {
        a.sleeping = false;
        a.sleepTimer = 0;
      }
    }

    // Wake neighbors of destroyed bodies
    const deadBodies = world.bodies.filter(b => b.dead);
    for (let deadBody of deadBodies) {
      for (let body of world.bodies) {
        if (body === deadBody) continue;
        const d = U.dist(body, deadBody);
        if (d < 120) {
          body.sleeping = false;
          body.sleepTimer = 0;
        }
      }
    }

    // 7) Remove dead bodies
    world.bodies = world.bodies.filter(b => !b.dead);
  },

  _getContact(a, b) {
    if (a.shape === 'circle' && b.shape === 'circle') return P._circleCircleContact(a, b);
    if (a.shape === 'circle' && b.shape === 'box') return P._circleBoxContact(a, b);
    if (a.shape === 'box' && b.shape === 'circle') {
      const contact = P._circleBoxContact(b, a);
      if (contact) {
        contact.nx = -contact.nx;
        contact.ny = -contact.ny;
      }
      return contact;
    }
    if (a.shape === 'box' && b.shape === 'box') return P._boxBoxContact(a, b);
    return null;
  },

  _circleCircleContact(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.r + b.r;
    if (d >= minDist) return null;

    let nx, ny, depth;
    if (d === 0) {
      nx = 0;
      ny = -1;
      depth = minDist;
    } else {
      nx = dx / d;
      ny = dy / d;
      depth = minDist - d;
    }
    return { a, b, nx, ny, depth };
  },

  _circleBoxContact(circle, box) {
    const cx = U.clamp(circle.x, box.x - box.hw, box.x + box.hw);
    const cy = U.clamp(circle.y, box.y - box.hh, box.y + box.hh);

    if (circle.x === cx && circle.y === cy) {
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
      const dx = cx - circle.x;
      const dy = cy - circle.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= circle.r) return null;
      const nx = -dx / d;
      const ny = -dy / d;
      const depth = circle.r - d;
      return { a: circle, b: box, nx, ny, depth };
    }
  },

  _boxBoxContact(a, b) {
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

  _solveContact(contact) {
    const { a, b, nx, ny } = contact;
    const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rvn > 0) return;

    const inv = a.invMass + b.invMass;
    if (inv === 0) return;

    let e = Math.min(a.e, b.e);
    if (Math.abs(rvn) < 60) e = 0;

    const j = -(1 + e) * rvn / inv;
    a.vx -= j * nx * a.invMass;
    a.vy -= j * ny * a.invMass;
    b.vx += j * nx * b.invMass;
    b.vy += j * ny * b.invMass;

    // Friction
    const tx = -ny;
    const ty = nx;
    const rvt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
    let jt = -rvt / inv;
    const mu = Math.sqrt(a.mu * b.mu);
    jt = U.clamp(jt, -Math.abs(j) * mu, Math.abs(j) * mu);
    a.vx -= jt * tx * a.invMass;
    a.vy -= jt * ty * a.invMass;
    b.vx += jt * tx * b.invMass;
    b.vy += jt * ty * b.invMass;
  },

  _correctPosition(contact) {
    const { a, b, nx, ny, depth } = contact;
    const corr = Math.max(depth - C.PEN_SLOP, 0) / (a.invMass + b.invMass) * C.PEN_PERCENT;
    a.x -= corr * a.invMass * nx;
    a.y -= corr * a.invMass * ny;
    b.x += corr * b.invMass * nx;
    b.y += corr * b.invMass * ny;
  },

  _applyDamage(self, other, vn) {
    if (self.hp === Infinity) return;
    const otherMassEff = other.isStatic ? (self.mass * C.STATIC_MASS_FACTOR) : other.mass;
    const ratio = Math.min(C.DMG_MASS_CAP, otherMassEff / self.mass);
    const dmg = (vn - C.DMG_MIN_SPEED) * C.DMG_SCALE * ratio;
    self.hp -= dmg;
    if (self.hp <= 0) self.dead = true;
  },

  queryRadius(world, x, y, r) {
    const result = [];
    for (let body of world.bodies) {
      const d = U.dist({ x, y }, body);
      if (d < r) result.push(body);
    }
    return result;
  }
};
