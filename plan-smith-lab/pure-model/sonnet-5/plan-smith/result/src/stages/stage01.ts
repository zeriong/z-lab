import { StageDef } from '../types/stage';
import { makeHouse } from './houseTemplate';

const TERRAIN = [{ x: 600, y: 540, width: 1200, height: 40 }];
const GROUND_TOP = 520;

const house1 = makeHouse({
  idPrefix: 's1-h1',
  cx: 500,
  groundTop: GROUND_TOP,
  pillarMaterial: 'wood',
  roofMaterial: 'wood',
});

const stage01: StageDef = {
  id: 1,
  name: '첫 발사',
  background: '/assets/backgrounds/stage-01.svg',
  slingshot: { anchor: { x: 120, y: 450 } },
  projectileCount: 3,
  terrain: TERRAIN,
  blocks: [...house1.blocks],
  pigs: [house1.pig],
};

export default stage01;
