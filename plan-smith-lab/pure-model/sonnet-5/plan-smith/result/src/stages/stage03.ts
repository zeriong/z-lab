import { StageDef } from '../types/stage';
import { makeHouse } from './houseTemplate';

const TERRAIN = [{ x: 600, y: 540, width: 1200, height: 40 }];
const GROUND_TOP = 520;

const house1 = makeHouse({ idPrefix: 's3-h1', cx: 500, groundTop: GROUND_TOP, pillarMaterial: 'wood', roofMaterial: 'wood' });
const house2 = makeHouse({ idPrefix: 's3-h2', cx: 650, groundTop: GROUND_TOP, pillarMaterial: 'stone', roofMaterial: 'stone' });

const stage03: StageDef = {
  id: 3,
  name: '돌의 등장',
  background: '/assets/backgrounds/stage-03.svg',
  slingshot: { anchor: { x: 120, y: 450 } },
  projectileCount: 4,
  terrain: TERRAIN,
  blocks: [...house1.blocks, ...house2.blocks],
  pigs: [house1.pig, house2.pig],
};

export default stage03;
