export type MaterialType = 'wood' | 'stone' | 'glass';

export interface Vec2 {
  x: number;
  y: number;
}

export interface TerrainPlatform {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 라디안. 경사 지형(콘텐츠 축 6-8: "경사/틈이 있는 지형") 표현용. */
  angle?: number;
}

export interface BlockDef {
  id: string;
  material: MaterialType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
}

export interface PigDef {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface SlingshotDef {
  anchor: Vec2;
  /** 새총 앵커 반경(px). 미지정 시 스텝 2의 기본 상수(60px, 콜드스타트 테이블 참조)를 사용한다. */
  anchorRadius?: number;
}

export interface StageDef {
  id: number;
  name: string;
  /** 스테이지당 정적 배경 이미지 1장의 경로 (표면 19번, 최소 표면). */
  background: string;
  slingshot: SlingshotDef;
  projectileCount: number;
  /** 지형(바닥). 다중 세그먼트로 틈/경사를 표현한다(콘텐츠 축 6-8). */
  terrain: TerrainPlatform[];
  blocks: BlockDef[];
  pigs: PigDef[];
}
