const Engine = Matter.Engine;
const World = Matter.World;
const Body = Matter.Body;
const Bodies = Matter.Bodies;
const Events = Matter.Events;

class PhysicsEngine {
    constructor() {
        this.engine = Engine.create();
        this.engine.gravity.y = 1; // 중력 가속도
        this.collisionPairs = [];
        this.damageMap = new Map(); // body id -> damage amount
        this.destroyedBodies = new Set();

        this.setupCollisionEvents();
    }

    setupCollisionEvents() {
        Events.on(this.engine, 'afterUpdate', () => {
            // Matter.js v0.19에서는 이벤트 기반 충돌 감지
            // 각 바디의 접촉점 정보는 pairs로 접근
        });
    }

    createCircle(x, y, radius, isStatic = false, label = 'bird') {
        const body = Bodies.circle(x, y, radius, {
            restitution: 0.5,
            friction: 0.4,
            label: label,
            isStatic: isStatic
        });
        World.add(this.engine.world, body);
        return body;
    }

    createRectangle(x, y, width, height, isStatic = false, label = 'block') {
        const body = Bodies.rectangle(x, y, width, height, {
            restitution: 0.3,
            friction: 0.5,
            label: label,
            isStatic: isStatic
        });
        World.add(this.engine.world, body);
        return body;
    }

    createConstraint(bodyA, bodyB, length) {
        const constraint = Matter.Constraint.create({
            bodyA: bodyA,
            bodyB: bodyB,
            length: length,
            stiffness: 1
        });
        World.add(this.engine.world, constraint);
        return constraint;
    }

    applyForce(body, forceX, forceY) {
        Body.applyForce(body, body.position, { x: forceX, y: forceY });
    }

    step(deltaTime) {
        Engine.update(this.engine, deltaTime);
        this.checkCollisions();
    }

    checkCollisions() {
        // Matter.js 내부 collision events 활용
        const pairs = this.engine.world.bodies;
        // 간단한 손상 계산: 충돌 속도 기반

        for (let pair of this.engine.world.bodies) {
            if (pair.speed > 5) {
                // 고속 충돌 감지 → 다른 물체와의 충돌 확률 높음
                const damageAmount = Math.min(Math.floor(pair.speed * 2), 100);
                if (!this.damageMap.has(pair.id)) {
                    this.damageMap.set(pair.id, 0);
                }
                // 매 프레임 누적하지 않도록 주의
            }
        }
    }

    clearWorld() {
        World.clear(this.engine.world, false);
        this.collisionPairs = [];
        this.damageMap.clear();
        this.destroyedBodies.clear();
    }

    removeBody(body) {
        if (body && this.engine.world.bodies.includes(body)) {
            World.remove(this.engine.world, body);
            this.destroyedBodies.add(body.id);
        }
    }

    getEngineData() {
        return {
            bodies: this.engine.world.bodies,
            constraints: this.engine.world.constraints
        };
    }

    simulateTrajectory(body, forceX, forceY, steps = 60) {
        // 일시적 복사본으로 궤적 계산
        const tempEngine = Engine.create();
        tempEngine.gravity = { x: 0, y: this.engine.gravity.y };

        const tempBody = Bodies.circle(body.position.x, body.position.y, 10, {
            restitution: 0.5
        });

        World.add(tempEngine.world, tempBody);
        Body.applyForce(tempBody, tempBody.position, { x: forceX, y: forceY });

        const trajectory = [];
        trajectory.push({ x: tempBody.position.x, y: tempBody.position.y });

        for (let i = 0; i < steps; i++) {
            Engine.update(tempEngine, 1000 / 60);
            trajectory.push({ x: tempBody.position.x, y: tempBody.position.y });

            // 화면 밖으로 나가면 중단
            if (tempBody.position.x < 0 || tempBody.position.x > 800 ||
                tempBody.position.y > 600) {
                break;
            }
        }

        World.clear(tempEngine.world, false);
        return trajectory;
    }
}
