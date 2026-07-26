import Matter from 'matter-js';
import { MATERIALS, type Material } from '../../core/constants.ts';

const { Bodies } = Matter;

export class Block {
  readonly body: Matter.Body;
  readonly material: Material;
  readonly w: number;
  readonly h: number;
  hp: number;
  readonly maxHp: number;
  destroyed = false;

  constructor(x: number, y: number, w: number, h: number, material: Material, angle = 0) {
    this.material = material;
    this.w = w;
    this.h = h;
    const spec = MATERIALS[material];
    this.hp = spec.hp;
    this.maxHp = spec.hp;
    this.body = Bodies.rectangle(x, y, w, h, {
      density: spec.density,
      restitution: 0.05,
      friction: 0.5,
      angle,
      label: `block:${material}`,
    });
  }
}
