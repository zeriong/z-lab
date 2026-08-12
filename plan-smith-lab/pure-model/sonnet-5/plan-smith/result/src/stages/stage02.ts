import { StageDef } from '../types/stage';
import { makeHouse } from './houseTemplate';

const TERRAIN = [{ x: 600, y: 540, width: 1200, height: 40 }];
const GROUND_TOP = 520;

const house1 = makeHouse({ idPrefix: 's2-h1', cx: 500, groundTop: GROUND_TOP, pillarMaterial: 'wood', roofMaterial: 'wood' });
const house2 = makeHouse({ idPrefix: 's2-h2', cx: 650, groundTop: GROUND_TOP, pillarMaterial: 'wood', roofMaterial: 'wood' });

const stage02: StageDef = {
  id: 2,
  name: '두 마리 돼지',
  background: '/assets/backgrounds/stage-02.svg',
  slingshot: { anchor: { x: 120, y: 450 } },
  projectileCount: 4,
  terrain: TERRAIN,
  blocks: [...house1.blocks, ...house2.blocks],
  pigs: [house1.pig, house2.pig],
};

export default stage02;
