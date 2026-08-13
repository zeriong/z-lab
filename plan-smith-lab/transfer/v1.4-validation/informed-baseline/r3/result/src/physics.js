// src/physics.js
// 2D 물리 엔진 (회전 없음, 임펄스 기반)
// 의존성: U, C

const P = {
  createWorld() {
    return {
      bodies: [],
      nextId: 0
    };
  },

  addBox(world, x, y, hw, hh, props = {}) {
    const mat = props.mat ? MAT[props.mat] : MAT.wood;
    const mass = (2 * hw * 2 * hh * mat.density) / 1000;
    const invMass = props.isStatic ? 0 : (1 / mass);

    const body = {
      id: world.nextId++,
      shape: 'box',
      x, y,
      vx: 0, vy: 0,
      hw, hh,
      mass: props.isStatic ? Infinity : mass,
      invMass,
      e: mat.e,
      mu: mat.mu,
      isStatic: props.isStatic || false,
      sleeping: false,
      sleepTimer: 0,
      hp: mat.hp,
      maxHp: mat.hp,
      kind: props.kind || 'block',
      mat: props.mat || 'wood',
      dead: false,
      angle: 0
    };
    world.bodies.push(body);
    return body;
  },

  addCircle(world, x, y, r, props = {}) {
    const mat = props.mat ? MAT[props.mat] : MAT.bird;
    const mass = (Math.PI * r * r * mat.density) / 1000;
    const invMass = props.isStatic ? 0 : (1 / mass);

    const body = {
      id: world.nextId++,
      shape: 'circle',
      x, y,
      vx: 0, vy: 0,
      r,
      mass: props.isStatic ? Infinity : mass,
      invMass,
      e: mat.e,
      mu: mat.mu,
      isStatic: props.isStatic || false,
      sleeping: false,
      sleepTimer: 0,
      hp: mat.hp,
      maxHp: mat.hp,
      kind: props.kind || 'block',
      mat: props.mat || 'bird',
      dead: false,
      angle: 0
    };
    world.bodies.push(body);
    return body;
  },

  step(world, dt) {
    const bodies = world.bodies;

    // 1) 적분 (정적/슬립 제외)
    for (const b of bodies) {
      if (b.isStatic || b.sleeping) continue;
      b.vy += C.GRAVITY * dt;
      b.vx -= b.vx * C.LINEAR_DAMP * dt;
      b.vy -= b.vy * C.LINEAR_DAMP * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    // 2) 접촉 수집
    const contacts = [];
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j];

        // 둘 다 정적 또는 둘 다 슬립이면 건너뜀
        if (a.isStatic && b.isStatic) continue;
        if (a.sleeping && b.sleeping) continue;

        const contact = P._checkCollision(a, b);
        if (contact) {
          contacts.push(contact);
        }
      }
    }

    // 3) 피해 계산 (반복 전 1회)
    for (const c of contacts) {
      const a = c.a, b = c.b;
      const nx = c.nx, ny = c.ny;

      const vn = -((b.vx - a.vx) * nx + (b.vy - a.vy) * ny);

      if (vn > C.DMG_MIN_SPEED) {
        P._applyDamage(a, b, vn);
        P._applyDamage(b, a, vn);
      }
    }

    // 4) 임펄스 반복
    for (let iter = 0; iter < C.SOLVER_ITER; iter++) {
      for (const c of contacts) {
        P._solveContact(c);
      }
    }

    // 5) 위치 보정 (반복 후 1회)
    for (const c of contacts) {
      const a = c.a, b = c.b;
      const nx = c.nx, ny = c.ny;
      const depth = c.depth;

      const corr = Math.max(depth - C.PEN_SLOP, 0) / (a.invMass + b.invMass) * C.PEN_PERCENT;

      a.x -= corr * a.invMass * nx;
      a.y -= corr * a.invMass * ny;
      b.x += corr * b.invMass * nx;
      b.y += corr * b.invMass * ny;
    }

    // 6) 슬립 갱신
    for (const b of bodies) {
      if (b.isStatic) continue;

      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (speed < C.SLEEP_SPEED) {
        b.sleepTimer += dt;
        if (b.sleepTimer > C.SLEEP_TIME) {
          b.sleeping = true;
          b.vx = 0;
          b.vy = 0;
        }
      } else {
        b.sleepTimer = 0;
        if (b.sleeping) {
          b.sleeping = false;
        }
      }
    }

    // 활성 바디가 있으면 인접한 슬립 바디를 깨운다
    for (const active of bodies) {
      if (active.sleeping || active.isStatic) continue;
      const activeSpeed = Math.sqrt(active.vx * active.vx + active.vy * active.vy);
      if (activeSpeed < C.WAKE_SPEED) continue;

      for (const sleeping of bodies) {
        if (!sleeping.sleeping) continue;
        let d = 0;
        if (active.shape === 'circle' && sleeping.shape === 'circle') {
          d = U.dist(active.x, active.y, sleeping.x, sleeping.y);
        } else {
          // 근사: 중심거리
          d = U.dist(active.x, active.y, sleeping.x, sleeping.y);
        }
        if (d < 150) {
          sleeping.sleeping = false;
          sleeping.sleepTimer = 0;
        }
      }
    }

    // 7) dead 플래그 바디 제거
    for (let i = world.bodies.length - 1; i >= 0; i--) {
      if (world.bodies[i].dead) {
        world.bodies.splice(i, 1);
      }
    }
  },

  _checkCollision(a, b) {
    if (a.shape === 'circle' && b.shape === 'circle') {
      return P._checkCircleCircle(a, b);
    } else if (a.shape === 'circle' && b.shape === 'box') {
      return P._checkCircleBox(a, b);
    } else if (a.shape === 'box' && b.shape === 'circle') {
      const c = P._checkCircleBox(b, a);
      if (c) {
        c.nx = -c.nx;
        c.ny = -c.ny;
        [c.a, c.b] = [c.b, c.a];
      }
      return c;
    } else if (a.shape === 'box' && b.shape === 'box') {
      return P._checkBoxBox(a, b);
    }
    return null;
  },

  _checkCircleCircle(a, b) {
    const d = U.dist(a.x, a.y, b.x, b.y);
    const minDist = a.r + b.r;
    if (d < minDist) {
      let nx, ny, depth;
      if (d === 0) {
        nx = 0;
        ny = -1;
        depth = a.r + b.r;
      } else {
        nx = (b.x - a.x) / d;
        ny = (b.y - a.y) / d;
        depth = minDist - d;
      }
      return { a, b, nx, ny, depth };
    }
    return null;
  },

  _checkCircleBox(a, b) {
    // a=원, b=박스
    const qx = U.clamp(a.x, b.x - b.hw, b.x + b.hw);
    const qy = U.clamp(a.y, b.y - b.hh, b.y + b.hh);

    if (qx === a.x && qy === a.y) {
      // 원 중심이 박스 안
      const dx = b.hw - Math.abs(a.x - b.x);
      const dy = b.hh - Math.abs(a.y - b.y);

      let nx, ny, depth;
      if (dx < dy) {
        // x축 분리
        nx = U.sign(a.x - b.x);
        ny = 0;
        depth = dx + a.r;
      } else {
        // y축 분리
        nx = 0;
        ny = U.sign(a.y - b.y);
        depth = dy + a.r;
      }
      return { a, b, nx, ny, depth };
    } else {
      // 원 중심이 박스 밖
      const d = U.dist(a.x, a.y, qx, qy);
      if (d < a.r) {
        const nx = (qx - a.x) / d;
        const ny = (qy - a.y) / d;
        const depth = a.r - d;
        return { a, b, nx, ny, depth };
      }
    }
    return null;
  },

  _checkBoxBox(a, b) {
    const ox = (a.hw + b.hw) - Math.abs(b.x - a.x);
    const oy = (a.hh + b.hh) - Math.abs(b.y - a.y);

    if (ox > 0 && oy > 0) {
      let nx, ny, depth;
      if (ox < oy) {
        // x축 분리
        nx = U.sign(b.x - a.x);
        ny = 0;
        depth = ox;
      } else {
        // y축 분리
        nx = 0;
        ny = U.sign(b.y - a.y);
        depth = oy;
      }
      return { a, b, nx, ny, depth };
    }
    return null;
  },

  _solveContact(contact) {
    const a = contact.a, b = contact.b;
    const nx = contact.nx, ny = contact.ny;

    // 법선 방향 상대 속도
    const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;

    // 이미 분리 중이면 무시
    if (rvn > 0) return;

    const inv = a.invMass + b.invMass;
    if (inv === 0) return;

    let e = Math.min(a.e, b.e);

    // 저속 반발 억제 → 스택 안정화 (필수)
    if (Math.abs(rvn) < 60) {
      e = 0;
    }

    const j = -(1 + e) * rvn / inv;

    // 속도 갱신 (법선)
    a.vx -= j * nx * a.invMass;
    a.vy -= j * ny * a.invMass;
    b.vx += j * nx * b.invMass;
    b.vy += j * ny * b.invMass;

    // 마찰
    const tx = -ny;
    const ty = nx;
    const rvt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
    const jt = -rvt / inv;
    const mu = Math.sqrt(a.mu * b.mu);
    const jtClamped = U.clamp(jt, -Math.abs(j) * mu, Math.abs(j) * mu);

    a.vx -= jtClamped * tx * a.invMass;
    a.vy -= jtClamped * ty * a.invMass;
    b.vx += jtClamped * tx * b.invMass;
    b.vy += jtClamped * ty * b.invMass;
  },

  _applyDamage(self, other, vn) {
    if (self.hp === Infinity) return;  // 새, 지면은 무피해

    const otherMassEff = other.isStatic
      ? (self.mass * C.STATIC_MASS_FACTOR)
      : other.mass;
    const ratio = Math.min(C.DMG_MASS_CAP, otherMassEff / self.mass);
    const dmg = (vn - C.DMG_MIN_SPEED) * C.DMG_SCALE * ratio;

    self.hp -= dmg;
    if (self.hp <= 0 && self.hp !== Infinity) {
      self.dead = true;
    }
  },

  queryRadius(world, x, y, r) {
    const result = [];
    for (const b of world.bodies) {
      const d = U.dist(x, y, b.x, b.y);
      if (d <= r) {
        result.push(b);
      }
    }
    return result;
  }
};
