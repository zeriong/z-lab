import { StageDef } from '../types/stage';
import { makeHouse } from './houseTemplate';

const TERRAIN = [{ x: 600, y: 540, width: 1200, height: 40 }];
const GROUND_TOP = 520;

const house1 = makeHouse({ idPrefix: 's4-h1', cx: 500, groundTop: GROUND_TOP, pillarMaterial: 'wood', roofMaterial: 'wood' });
const house2 = makeHouse({ idPrefix: 's4-h2', cx: 650, groundTop: GROUND_TOP, pillarMaterial: 'stone', roofMaterial: 'stone' });
const house3 = makeHouse({ idPrefix: 's4-h3', cx: 800, groundTop: GROUND_TOP, pillarMaterial: 'glass', roofMaterial: 'glass' });

const stage04: StageDef = {
  id: 4,
  name: '유리 세공',
  background: '/assets/backgrounds/stage-04.svg',
  slingshot: { anchor: { x: 120, y: 450 } },
  projectileCount: 5,
  terrain: TERRAIN,
  blocks: [...house1.blocks, ...house2.blocks, ...house3.blocks],
  pigs: [house1.pig, house2.pig, house3.pig],
};

export default stage04;
