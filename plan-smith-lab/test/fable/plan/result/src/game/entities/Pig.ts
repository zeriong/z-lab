import Matter from 'matter-js';
import { PIG_DENSITY, PIG_HP } from '../../core/constants.ts';

const { Bodies } = Matter;

export class Pig {
  readonly body: Matter.Body;
  readonly radius: number;
  hp = PIG_HP;
  readonly maxHp = PIG_HP;
  dead = false;

  constructor(x: number, y: number, radius: number) {
    this.radius = radius;
    this.body = Bodies.circle(x, y, radius, {
      density: PIG_DENSITY,
      restitution: 0.2,
      friction: 0.6,
      label: 'pig',
    });
  }
}
