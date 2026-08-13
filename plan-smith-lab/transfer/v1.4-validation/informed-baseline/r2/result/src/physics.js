// Physics engine
window.P = (() => {
  let bodyIdCounter = 0;

  function createWorld() {
    return {
      bodies: []
    };
  }

  function addBox(world, x, y, hw, hh, mat, isStatic = false) {
    const matData = MAT[mat];
    let mass = isStatic ? Infinity : (2 * hw * 2 * hh * matData.density) / 1000;
    const body = {
      id: bodyIdCounter++,
      shape: 'box',
      x, y,
      vx: 0, vy: 0,
      hw, hh,
      mass,
      invMass: mass === Infinity ? 0 : 1 / mass,
      e: matData.e,
      mu: matData.mu,
      isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp: matData.hp,
      maxHp: matData.hp,
      kind: 'block',
      mat,
      dead: false,
      angle: 0
    };
    world.bodies.push(body);
    return body;
  }

  function addCircle(world, x, y, r, mat, isStatic = false) {
    const matData = MAT[mat];
    let mass = isStatic ? Infinity : (Math.PI * r * r * matData.density) / 1000;
    const body = {
      id: bodyIdCounter++,
      shape: 'circle',
      x, y,
      vx: 0, vy: 0,
      r,
      mass,
      invMass: mass === Infinity ? 0 : 1 / mass,
      e: matData.e,
      mu: matData.mu,
      isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp: matData.hp,
      maxHp: matData.hp,
      kind: 'block',
      mat,
      dead: false,
      angle: 0
    };
    world.bodies.push(body);
    return body;
  }

  function circleCircleContact(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.r + b.r;

    if (d >= minDist) return null;

    let nx, ny, depth;
    if (d < 0.001) {
      nx = 0;
      ny = -1;
      depth = minDist;
    } else {
      nx = dx / d;
      ny = dy / d;
      depth = minDist - d;
    }

    return { a, b, nx, ny, depth };
  }

  function circleBoxContact(circle, box) {
    // Circle center clamped to box AABB
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
  }

  function boxBoxContact(a, b) {
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
  }

  function getContact(a, b) {
    if (a.shape === 'circle' && b.shape === 'circle') {
      return circleCircleContact(a, b);
    } else if (a.shape === 'circle' && b.shape === 'box') {
      return circleBoxContact(a, b);
    } else if (a.shape === 'box' && b.shape === 'circle') {
      const contact = circleBoxContact(b, a);
      if (contact) {
        // Swap a and b, flip normal
        return {
          a: contact.b,
          b: contact.a,
          nx: -contact.nx,
          ny: -contact.ny,
          depth: contact.depth
        };
      }
      return null;
    } else {
      return boxBoxContact(a, b);
    }
  }

  function step(world, dt) {
    // 1) Integrate
    for (const body of world.bodies) {
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

        const contact = getContact(a, b);
        if (contact) {
          contacts.push(contact);
        }
      }
    }

    // 3) Apply damage
    for (const contact of contacts) {
      const rvn = -((contact.b.vx - contact.a.vx) * contact.nx +
                     (contact.b.vy - contact.a.vy) * contact.ny);

      if (rvn > C.DMG_MIN_SPEED) {
        applyDamage(contact.a, contact.b, rvn);
        applyDamage(contact.b, contact.a, rvn);
      }
    }

    // 4) Impulse iterations
    for (let iter = 0; iter < C.SOLVER_ITER; iter++) {
      for (const contact of contacts) {
        resolveImpulse(contact);
      }
    }

    // 5) Position correction
    for (const contact of contacts) {
      const inv = contact.a.invMass + contact.b.invMass;
      if (inv === 0) continue;

      const corr = Math.max(contact.depth - C.PEN_SLOP, 0) / inv * C.PEN_PERCENT;
      contact.a.x -= corr * contact.a.invMass * contact.nx;
      contact.a.y -= corr * contact.a.invMass * contact.ny;
      contact.b.x += corr * contact.b.invMass * contact.nx;
      contact.b.y += corr * contact.b.invMass * contact.ny;
    }

    // 6) Sleep update
    for (const body of world.bodies) {
      if (body.isStatic) continue;

      const speed2 = body.vx * body.vx + body.vy * body.vy;
      if (speed2 < C.SLEEP_SPEED * C.SLEEP_SPEED) {
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

    // Wake up nearby bodies when one is destroyed
    const toDestroy = world.bodies.filter(b => b.dead);
    for (const dead of toDestroy) {
      for (const body of world.bodies) {
        if (body === dead) continue;
        const d = U.dist(dead, body);
        if (d < 120) {
          body.sleeping = false;
          body.sleepTimer = 0;
        }
      }
    }

    // 7) Remove dead bodies
    world.bodies = world.bodies.filter(b => !b.dead);
  }

  function resolveImpulse(contact) {
    const rvn = (contact.b.vx - contact.a.vx) * contact.nx +
                (contact.b.vy - contact.a.vy) * contact.ny;

    if (rvn > 0) return;

    const inv = contact.a.invMass + contact.b.invMass;
    if (inv === 0) return;

    let e = Math.min(contact.a.e, contact.b.e);
    if (Math.abs(rvn) < 60) e = 0;

    const j = -(1 + e) * rvn / inv;

    contact.a.vx -= j * contact.nx * contact.a.invMass;
    contact.a.vy -= j * contact.ny * contact.a.invMass;
    contact.b.vx += j * contact.nx * contact.b.invMass;
    contact.b.vy += j * contact.ny * contact.b.invMass;

    // Friction
    const tx = -contact.ny;
    const ty = contact.nx;
    const rvt = (contact.b.vx - contact.a.vx) * tx +
                (contact.b.vy - contact.a.vy) * ty;

    let jt = -rvt / inv;
    const mu = Math.sqrt(contact.a.mu * contact.b.mu);
    jt = U.clamp(jt, -Math.abs(j) * mu, Math.abs(j) * mu);

    contact.a.vx -= jt * tx * contact.a.invMass;
    contact.a.vy -= jt * ty * contact.a.invMass;
    contact.b.vx += jt * tx * contact.b.invMass;
    contact.b.vy += jt * ty * contact.b.invMass;
  }

  function applyDamage(self, other, vn) {
    const otherMassEff = other.isStatic ? (self.mass * C.STATIC_MASS_FACTOR) : other.mass;
    const ratio = Math.min(C.DMG_MASS_CAP, otherMassEff / self.mass);
    const dmg = (vn - C.DMG_MIN_SPEED) * C.DMG_SCALE * ratio;

    if (self.hp !== Infinity) {
      self.hp -= dmg;
      if (self.hp <= 0) {
        self.dead = true;
      }
    }
  }

  function queryRadius(world, x, y, r) {
    const result = [];
    for (const body of world.bodies) {
      const d = U.dist({ x, y }, body);
      if (d < r) {
        result.push(body);
      }
    }
    return result;
  }

  return {
    createWorld,
    addBox,
    addCircle,
    step,
    queryRadius
  };
})();
