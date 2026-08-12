import Matter from 'matter-js';
import { PhysicsAdapter, assertBodyPositionValid } from './physicsAdapter';

/**
 * 구현자 계약 — "Matter.js가 사는 것"의 증명 산출물.
 * 스텝 0 직후 스파이크: 블록 3개를 쌓고 발사체 1개를 충돌시켜 collisionStart 이벤트가
 * 발생하고 콘솔에 로그를 남기는지 수동 1회 확인한다.
 * 실행: 개발 서버에서 `?spike=1` 쿼리스트링으로 접속(main.ts에서 조건부 호출).
 */
export function runMatterSpike(): void {
  const adapter = new PhysicsAdapter(1);

  const ground = Matter.Bodies.rectangle(400, 590, 800, 20, { isStatic: true, label: 'ground', density: 1 });
  const block1 = Matter.Bodies.rectangle(400, 560, 40, 40, { label: 'destructible:wood:spike-1', density: 0.01 });
  const block2 = Matter.Bodies.rectangle(400, 520, 40, 40, { label: 'destructible:wood:spike-2', density: 0.01 });
  const block3 = Matter.Bodies.rectangle(400, 480, 40, 40, { label: 'destructible:wood:spike-3', density: 0.01 });
  const projectile = Matter.Bodies.circle(100, 400, 15, { label: 'projectile', density: 0.02 });

  [ground, block1, block2, block3, projectile].forEach(assertBodyPositionValid);
  adapter.addBodies([ground, block1, block2, block3, projectile]);

  adapter.onCollisionStart((pairs) => {
    pairs.forEach((pair) => {
      // eslint-disable-next-line no-console
      console.log(`[spike] collisionStart: ${pair.bodyA.label} x ${pair.bodyB.label}`);
    });
  });

  Matter.Body.setVelocity(projectile, { x: 8, y: -2 });
  adapter.start();
}
