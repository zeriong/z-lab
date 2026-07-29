var AB = window.AB || (window.AB = {});

// ---------------------------------------------------------------------------
// Custom fixed-timestep 2D rigid body engine (circles + oriented boxes,
// distance-constraint joints). Written from scratch instead of pulling in a
// library such as Matter.js:
//
//  1. No install/build/network step is available (file:// static page), so
//     a CDN/vendor script cannot be reliably fetched or verified here.
//  2. The plan's A1xA3 anchor requires "고정 타임스텝 + 시드 고정 RNG로 동일
//     재생 가능" -- popular libraries' default solvers are not guaranteed
//     deterministic across runs. A small custom solver with a fixed dt,
//     stable (array-order) iteration, and no wall-clock reads inside step()
//     satisfies that anchor directly. This is the plan's own pre-authorized
//     fallback branch (대안과 기각 근거: "부활 조건: Step 1 스파이크에서 ...
//     판명되면 재검토"), not a deviation from it.
// ---------------------------------------------------------------------------

AB.Physics = (function () {
  let nextId = 1;

  function createCircle(opts) {
    const r = opts.radius;
    const mass = opts.isStatic ? 0 : Math.PI * r * r * (opts.density || 1);
    const inertia = opts.isStatic ? 0 : mass * r * r * 0.5;
    return {
      id: nextId++,
      type: 'circle',
      x: opts.x, y: opts.y, angle: 0,
      vx: 0, vy: 0, angVel: 0,
      radius: r,
      mass: mass, invMass: mass ? 1 / mass : 0,
      inertia: inertia, invInertia: inertia ? 1 / inertia : 0,
      restitution: opts.restitution != null ? opts.restitution : 0.3,
      friction: opts.friction != null ? opts.friction : 0.5,
      isStatic: !!opts.isStatic,
      tag: opts.tag || 'block',
      breakImpulse: opts.breakImpulse != null ? opts.breakImpulse : Infinity,
      destroyed: false,
      life: opts.life != null ? opts.life : null
    };
  }

  function createBox(opts) {
    const w = opts.width, h = opts.height;
    const mass = opts.isStatic ? 0 : w * h * (opts.density || 1);
    const inertia = opts.isStatic ? 0 : mass * (w * w + h * h) / 12;
    return {
      id: nextId++,
      type: 'box',
      x: opts.x, y: opts.y, angle: opts.angle || 0,
      vx: 0, vy: 0, angVel: 0,
      hw: w / 2, hh: h / 2,
      mass: mass, invMass: mass ? 1 / mass : 0,
      inertia: inertia, invInertia: inertia ? 1 / inertia : 0,
      restitution: opts.restitution != null ? opts.restitution : 0.2,
      friction: opts.friction != null ? opts.friction : 0.6,
      isStatic: !!opts.isStatic,
      tag: opts.tag || 'block',
      material: opts.material || 'wood',
      breakImpulse: opts.breakImpulse != null ? opts.breakImpulse : Infinity,
      destroyed: false,
      life: null
    };
  }

  // -- vector / geometry helpers --------------------------------------------
  function rot(vx, vy, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return { x: vx * c - vy * s, y: vx * s + vy * c };
  }

  function cross(ax, ay, bx, by) { return ax * by - ay * bx; }

  function boxVertices(b) {
    const local = [
      { x: -b.hw, y: -b.hh }, { x: b.hw, y: -b.hh },
      { x: b.hw, y: b.hh }, { x: -b.hw, y: b.hh }
    ];
    return local.map(function (p) {
      const r = rot(p.x, p.y, b.angle);
      return { x: r.x + b.x, y: r.y + b.y };
    });
  }

  function boxAxes(b) {
    return [rot(1, 0, b.angle), rot(0, 1, b.angle)];
  }

  function project(vertices, axis) {
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < vertices.length; i++) {
      const p = vertices[i].x * axis.x + vertices[i].y * axis.y;
      if (p < min) min = p;
      if (p > max) max = p;
    }
    return { min: min, max: max };
  }

  // -- narrow phase ----------------------------------------------------------
  // Every manifold's normal points from the first argument body toward the
  // second, matching the a->b convention resolveCollision() expects.

  function circleVsCircle(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const pen = a.radius + b.radius - dist;
    if (pen <= 0) return null;
    const nx = dx / dist, ny = dy / dist;
    return {
      normal: { x: nx, y: ny },
      penetration: pen,
      point: { x: a.x + nx * a.radius, y: a.y + ny * a.radius }
    };
  }

  // box first, circle second -> normal points box -> circle
  function circleVsBox(box, circle) {
    const local = rot(circle.x - box.x, circle.y - box.y, -box.angle);
    const cx = Math.max(-box.hw, Math.min(box.hw, local.x));
    const cy = Math.max(-box.hh, Math.min(box.hh, local.y));
    const dx = local.x - cx, dy = local.y - cy;
    const dist = Math.hypot(dx, dy);
    let normalLocal, pen;
    if (dist > 0.0001) {
      if (dist > circle.radius) return null;
      normalLocal = { x: dx / dist, y: dy / dist };
      pen = circle.radius - dist;
    } else {
      // circle center is inside the box -- push out along the shallowest axis
      const ox = box.hw - Math.abs(local.x);
      const oy = box.hh - Math.abs(local.y);
      if (ox < oy) {
        normalLocal = { x: local.x < 0 ? -1 : 1, y: 0 };
        pen = ox + circle.radius;
      } else {
        normalLocal = { x: 0, y: local.y < 0 ? -1 : 1 };
        pen = oy + circle.radius;
      }
    }
    const worldNormal = rot(normalLocal.x, normalLocal.y, box.angle);
    const worldPoint = rot(cx, cy, box.angle);
    return {
      normal: worldNormal,
      penetration: pen,
      point: { x: worldPoint.x + box.x, y: worldPoint.y + box.y }
    };
  }

  // SAT with the two unique axes of each box. Contact point is approximated
  // as the deepest vertex of b inside a -- a single-point approximation
  // (not a full clipped manifold) which is an accepted simplification for
  // this scope; the plan names 궤적/충돌 accuracy as a measured proxy metric
  // rather than a proof obligation.
  function boxVsBox(a, b) {
    const axes = boxAxes(a).concat(boxAxes(b));
    const va = boxVertices(a), vb = boxVertices(b);
    let minOverlap = Infinity, minAxis = null;
    for (let i = 0; i < axes.length; i++) {
      const axis = axes[i];
      const pa = project(va, axis);
      const pb = project(vb, axis);
      const overlap = Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min);
      if (overlap <= 0) return null;
      if (overlap < minOverlap) { minOverlap = overlap; minAxis = axis; }
    }
    const dx = b.x - a.x, dy = b.y - a.y;
    let normal = minAxis;
    if (normal.x * dx + normal.y * dy < 0) normal = { x: -normal.x, y: -normal.y };
    let best = null, bestProj = Infinity;
    for (let i = 0; i < vb.length; i++) {
      const v = vb[i];
      const p = v.x * normal.x + v.y * normal.y;
      if (p < bestProj) { bestProj = p; best = v; }
    }
    return { normal: normal, penetration: minOverlap, point: best };
  }

  function resolveCollision(a, b, m, collisions) {
    const rax = m.point.x - a.x, ray = m.point.y - a.y;
    const rbx = m.point.x - b.x, rby = m.point.y - b.y;
    const avx = a.vx - a.angVel * ray, avy = a.vy + a.angVel * rax;
    const bvx = b.vx - b.angVel * rby, bvy = b.vy + b.angVel * rbx;
    const rvx = bvx - avx, rvy = bvy - avy;
    const velAlongNormal = rvx * m.normal.x + rvy * m.normal.y;
    if (velAlongNormal > 0) return; // separating already

    const raCrossN = cross(rax, ray, m.normal.x, m.normal.y);
    const rbCrossN = cross(rbx, rby, m.normal.x, m.normal.y);
    const invMassSum = a.invMass + b.invMass +
      raCrossN * raCrossN * a.invInertia + rbCrossN * rbCrossN * b.invInertia;
    if (invMassSum <= 0) return;

    const e = Math.min(a.restitution, b.restitution);
    const j = -(1 + e) * velAlongNormal / invMassSum;
    const ix = m.normal.x * j, iy = m.normal.y * j;

    a.vx -= ix * a.invMass; a.vy -= iy * a.invMass;
    a.angVel -= a.invInertia * cross(rax, ray, ix, iy);
    b.vx += ix * b.invMass; b.vy += iy * b.invMass;
    b.angVel += b.invInertia * cross(rbx, rby, ix, iy);

    // Coulomb friction, clamped by the normal impulse just applied.
    const rvx2 = (b.vx - b.angVel * rby) - (a.vx - a.angVel * ray);
    const rvy2 = (b.vy + b.angVel * rbx) - (a.vy + a.angVel * rax);
    const vn = rvx2 * m.normal.x + rvy2 * m.normal.y;
    let tx = rvx2 - vn * m.normal.x;
    let ty = rvy2 - vn * m.normal.y;
    const tlen = Math.hypot(tx, ty);
    if (tlen > 0.0001) {
      tx /= tlen; ty /= tlen;
      const raCrossT = cross(rax, ray, tx, ty);
      const rbCrossT = cross(rbx, rby, tx, ty);
      const tMassSum = a.invMass + b.invMass +
        raCrossT * raCrossT * a.invInertia + rbCrossT * rbCrossT * b.invInertia;
      let jt = -(rvx2 * tx + rvy2 * ty) / (tMassSum || 1);
      const mu = (a.friction + b.friction) * 0.5;
      const maxJt = Math.abs(j) * mu;
      jt = Math.max(-maxJt, Math.min(maxJt, jt));
      const fx = tx * jt, fy = ty * jt;
      a.vx -= fx * a.invMass; a.vy -= fy * a.invMass;
      a.angVel -= a.invInertia * cross(rax, ray, fx, fy);
      b.vx += fx * b.invMass; b.vy += fy * b.invMass;
      b.angVel += b.invInertia * cross(rbx, rby, fx, fy);
    }

    // Positional correction to stop sinking (Baumgarte-style). percent/slop
    // are declared-arbitrary stabilization constants, not physical values.
    const percent = 0.6, slop = 0.5;
    const invSum = a.invMass + b.invMass || 1;
    const corrMag = Math.max(m.penetration - slop, 0) / invSum * percent;
    const cx = m.normal.x * corrMag, cy = m.normal.y * corrMag;
    a.x -= cx * a.invMass; a.y -= cy * a.invMass;
    b.x += cx * b.invMass; b.y += cy * b.invMass;

    collisions.push({ a: a, b: b, impulse: Math.abs(j) });
  }

  // -- world -----------------------------------------------------------------
  function World(gravity) {
    this.gravity = gravity;
    this.bodies = [];
    this.joints = [];
    this.collisions = [];
    this.worldBottom = 2000;
  }

  World.prototype.add = function (body) { this.bodies.push(body); return body; };
  World.prototype.addJoint = function (joint) { this.joints.push(joint); return joint; };

  World.prototype.clear = function () {
    this.bodies.length = 0;
    this.joints.length = 0;
    this.collisions.length = 0;
  };

  // One fixed simulation step. No wall-clock reads, no Math.random() --
  // required for the plan's determinism anchor (A3). Destroyed/broken flags
  // are only *set* here; removal happens in cleanup() so the Judge module
  // gets a chance to inspect this.collisions first.
  World.prototype.step = function (dt) {
    this.collisions.length = 0;

    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      if (body.isStatic || body.destroyed) continue;
      body.vy += this.gravity * dt;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.angle += body.angVel * dt;
      if (body.life != null) {
        body.life -= dt;
        if (body.life <= 0) body.destroyed = true;
      }
    }

    for (let i = 0; i < this.joints.length; i++) {
      const joint = this.joints[i];
      if (joint.broken) continue;
      const a = joint.a, b = joint.b;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const diff = dist - joint.length;
      const invSum = a.invMass + b.invMass;
      if (invSum <= 0) continue;
      const nx = dx / dist, ny = dy / dist;
      const corr = diff / invSum;
      if (!a.isStatic) { a.x += nx * corr * a.invMass; a.y += ny * corr * a.invMass; }
      if (!b.isStatic) { b.x -= nx * corr * b.invMass; b.y -= ny * corr * b.invMass; }
      if (Math.abs(diff) > joint.breakDistance) joint.broken = true;
    }

    const bodies = this.bodies;
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (a.destroyed) continue;
      for (let k = i + 1; k < bodies.length; k++) {
        const b = bodies[k];
        if (b.destroyed) continue;
        if (a.isStatic && b.isStatic) continue;

        let m = null;
        if (a.type === 'circle' && b.type === 'circle') {
          m = circleVsCircle(a, b);
        } else if (a.type === 'circle' && b.type === 'box') {
          const r = circleVsBox(b, a); // box=b, circle=a -> normal b->a
          if (r) m = { normal: { x: -r.normal.x, y: -r.normal.y }, penetration: r.penetration, point: r.point };
        } else if (a.type === 'box' && b.type === 'circle') {
          m = circleVsBox(a, b); // normal a->b already
        } else {
          m = boxVsBox(a, b);
        }
        if (m) resolveCollision(a, b, m, this.collisions);
      }
    }

    for (let i = 0; i < this.bodies.length; i++) {
      if (this.bodies[i].y > this.worldBottom) this.bodies[i].destroyed = true;
    }
  };

  World.prototype.cleanup = function () {
    this.bodies = this.bodies.filter(function (b) { return !b.destroyed; });
    this.joints = this.joints.filter(function (j) { return !j.broken; });
  };

  return { createCircle: createCircle, createBox: createBox, World: World, boxVertices: boxVertices };
})();
