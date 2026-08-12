import type { GroundDef } from '../../data/levelSchema';
import { GROUND_SURFACE } from '../../physics/materials';
import type { BodyHandle, PhysicsWorld } from '../../physics/PhysicsWorld';

interface GroundPiece extends GroundDef {
  handle: BodyHandle;
}

/**
 * Static terrain. Ground rects are authored TOP-LEFT (the level JSON reads
 * like a tilemap that way) and never move, so no interpolation is needed.
 */
export class Ground {
  readonly pieces: GroundPiece[] = [];
  /** Left/right invisible walls keep bodies inside the world. */
  private readonly walls: BodyHandle[] = [];

  constructor(defs: GroundDef[], worldWidth: number, worldHeight: number, physics: PhysicsWorld) {
    for (const def of defs) {
      const handle = physics.addBody({
        shape: 'rect',
        x: def.x + def.w / 2,
        y: def.y + def.h / 2,
        w: def.w,
        h: def.h,
        density: 1,
        friction: GROUND_SURFACE.friction,
        frictionStatic: GROUND_SURFACE.frictionStatic,
        restitution: GROUND_SURFACE.restitution,
        isStatic: true,
        label: 'ground',
      });
      handle.userData = { kind: 'ground' };
      this.pieces.push({ ...def, handle });
    }

    for (const wallX of [-60, worldWidth + 60]) {
      const handle = physics.addBody({
        shape: 'rect',
        x: wallX,
        y: worldHeight / 2,
        w: 120,
        h: worldHeight * 4,
        density: 1,
        friction: 0.2,
        frictionStatic: 0.3,
        restitution: 0.05,
        isStatic: true,
        label: 'wall',
      });
      handle.userData = { kind: 'ground' };
      this.walls.push(handle);
    }
  }

  /** Top surface y of the highest ground piece — used by the art layer. */
  get surfaceY(): number {
    return this.pieces.length ? Math.min(...this.pieces.map((p) => p.y)) : 0;
  }

  dispose(physics: PhysicsWorld): void {
    for (const piece of this.pieces) physics.removeBody(piece.handle);
    for (const wall of this.walls) physics.removeBody(wall);
    this.pieces.length = 0;
    this.walls.length = 0;
  }
}
