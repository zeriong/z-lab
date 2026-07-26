import Matter from 'matter-js';
import { BIRD_SPECS, type BirdType } from '../../core/constants.ts';

const { Bodies, Body } = Matter;

export type BirdPhase = 'ready' | 'flying';

export class Bird {
  readonly body: Matter.Body;
  readonly type: BirdType;
  phase: BirdPhase = 'ready';

  constructor(type: BirdType, x: number, y: number) {
    this.type = type;
    const spec = BIRD_SPECS[type];
    this.body = Bodies.circle(x, y, spec.radius, {
      density: spec.density,
      restitution: 0.35,
      friction: 0.6,
      frictionAir: 0, // 공기저항 없음 — 궤적 예측 공식과 정확히 일치시키기 위함
      label: 'bird',
    });
    // 주의: isStatic을 생성 옵션으로 주면 Matter가 원본 mass를 저장하지 못해
    // setStatic(false) 복원 시 mass=Infinity → NaN이 된다. 동적으로 만든 뒤 static 전환.
    Body.setStatic(this.body, true); // 발사 전에는 kinematic하게 슬링샷에 붙어 있는다
  }

  get spec() {
    return BIRD_SPECS[this.type];
  }
}
