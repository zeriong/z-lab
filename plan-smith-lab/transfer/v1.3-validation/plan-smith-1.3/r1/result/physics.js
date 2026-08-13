const Physics = {
  engine: null,
  gravity: 0.2778,
  currentBlocks: [],
  currentPigs: [],
  bodiesToRemove: [],

  createWorld() {
    const { Engine, Composite, Bodies, Events } = Matter;

    this.engine = Engine.create({ enableSleeping: true });

    // 지면 (y=640 기준)
    const ground = Bodies.rectangle(640, 680, 1400, 80, { isStatic: true, label: 'ground' });
    Composite.add(this.engine.world, ground);

    // 좌측 벽
    const leftWall = Bodies.rectangle(-60, 360, 40, 1440, { isStatic: true, label: 'wall' });
    Composite.add(this.engine.world, leftWall);

    // 우측 벽
    const rightWall = Bodies.rectangle(1340, 360, 40, 1440, { isStatic: true, label: 'wall' });
    Composite.add(this.engine.world, rightWall);

    // 충돌 핸들러
    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        if (bodyA.plugin.dead || bodyB.plugin.dead) return;

        // 상대속도 계산
        const relVx = bodyA.velocity.x - bodyB.velocity.x;
        const relVy = bodyA.velocity.y - bodyB.velocity.y;
        const relSpeed = Math.hypot(relVx, relVy);

        // 피해 임계값
        const damageThreshold = 4;
        if (relSpeed < damageThreshold) return;

        // 정적 바디는 피해 없음
        if (!bodyA.isStatic && !bodyB.isStatic) {
          // 양쪽 모두 동적이면 피해 상호 적용
          const dmg = (relSpeed - damageThreshold) * 2.5;

          if (bodyA.plugin.kind === 'block' || bodyA.plugin.kind === 'pig') {
            bodyA.plugin.hp -= dmg * bodyB.mass;
            if (bodyA.plugin.hp <= 0) {
              bodyA.plugin.dead = true;
              Physics.bodiesToRemove.push(bodyA);
            }
          }

          if (bodyB.plugin.kind === 'block' || bodyB.plugin.kind === 'pig') {
            bodyB.plugin.hp -= dmg * bodyA.mass;
            if (bodyB.plugin.hp <= 0) {
              bodyB.plugin.dead = true;
              Physics.bodiesToRemove.push(bodyB);
            }
          }
        } else {
          // 하나만 정적이면 동적인 쪽만 피해
          if (!bodyA.isStatic && (bodyB.plugin.kind === 'block' || bodyB.plugin.kind === 'pig')) {
            const dmg = (relSpeed - damageThreshold) * 2.5;
            bodyB.plugin.hp -= dmg * bodyA.mass;
            if (bodyB.plugin.hp <= 0) {
              bodyB.plugin.dead = true;
              Physics.bodiesToRemove.push(bodyB);
            }
          } else if (!bodyB.isStatic && (bodyA.plugin.kind === 'block' || bodyA.plugin.kind === 'pig')) {
            const dmg = (relSpeed - damageThreshold) * 2.5;
            bodyA.plugin.hp -= dmg * bodyB.mass;
            if (bodyA.plugin.hp <= 0) {
              bodyA.plugin.dead = true;
              Physics.bodiesToRemove.push(bodyA);
            }
          }
        }
      });
    });
  },

  loadStage(stage) {
    const { Composite, Bodies } = Matter;

    // 기존 바디 제거
    this.clear();
    this.currentBlocks = [];
    this.currentPigs = [];
    this.bodiesToRemove = [];

    // 블록 생성
    stage.blocks.forEach((blockData) => {
      const blockType = BLOCK_TYPES[blockData.type];
      if (!blockType) return;

      const body = Bodies.rectangle(
        blockData.x,
        blockData.y,
        blockType.w,
        blockType.h,
        {
          density: blockType.density,
          restitution: 0.4,
          friction: 0.4,
          frictionAir: 0.001,
          label: 'block',
          plugin: {
            kind: 'block',
            type: blockData.type,
            hp: blockType.hp,
            maxHp: blockType.hp,
            color: blockType.color,
            w: blockType.w,
            h: blockType.h,
            dead: false,
            material: blockType.material
          }
        }
      );

      Composite.add(this.engine.world, body);
      this.currentBlocks.push(body);
    });

    // 돼지 생성
    stage.pigs.forEach((pigData) => {
      const body = Bodies.circle(
        pigData.x,
        pigData.y,
        20,
        {
          density: 0.0015,
          restitution: 0.4,
          friction: 0.4,
          frictionAir: 0.001,
          label: 'pig',
          plugin: {
            kind: 'pig',
            hp: 100,
            maxHp: 100,
            color: '#90ee90',
            dead: false
          }
        }
      );

      Composite.add(this.engine.world, body);
      this.currentPigs.push(body);
    });

    return {
      blocks: this.currentBlocks,
      pigs: this.currentPigs
    };
  },

  spawnBirdBody(x, y, vx, vy) {
    const { Composite, Bodies } = Matter;

    const body = Bodies.circle(x, y, 18, {
      density: 0.004,
      restitution: 0.4,
      friction: 0.4,
      frictionAir: 0.0005,
      label: 'bird',
      plugin: {
        kind: 'bird',
        color: '#e74c3c',
        dead: false
      }
    });

    const { Body } = Matter;
    Body.setVelocity(body, { x: vx, y: vy });
    Composite.add(this.engine.world, body);

    return body;
  },

  step() {
    const { Engine, Composite } = Matter;

    Engine.update(this.engine, 1000 / 60);

    // 화면 밖 바디 제거
    const allBodies = Composite.allBodies(this.engine.world);
    allBodies.forEach((body) => {
      if (body.isStatic) return;
      const x = body.position.x;
      const y = body.position.y;

      if (x < -200 || x > 1480 || y > 920) {
        if (!this.bodiesToRemove.includes(body)) {
          this.bodiesToRemove.push(body);
        }
      }
    });

    // 일괄 제거
    this.bodiesToRemove.forEach((body) => {
      Composite.remove(this.engine.world, body);

      // currentBlocks와 currentPigs에서도 제거
      const blockIdx = this.currentBlocks.indexOf(body);
      if (blockIdx !== -1) this.currentBlocks.splice(blockIdx, 1);

      const pigIdx = this.currentPigs.indexOf(body);
      if (pigIdx !== -1) this.currentPigs.splice(pigIdx, 1);
    });
    this.bodiesToRemove = [];
  },

  isSettled() {
    const { Composite } = Matter;
    const allBodies = Composite.allBodies(this.engine.world);

    let settled = true;
    allBodies.forEach((body) => {
      if (body.isStatic) return;
      if (body.speed > 0.35) {
        settled = false;
      }
    });

    return settled;
  },

  clear() {
    const { Composite } = Matter;

    // currentBlocks와 currentPigs의 모든 바디 제거 (지면과 벽 제외)
    [...this.currentBlocks, ...this.currentPigs].forEach((body) => {
      Composite.remove(this.engine.world, body);
    });

    this.currentBlocks = [];
    this.currentPigs = [];
    this.bodiesToRemove = [];
  }
};
