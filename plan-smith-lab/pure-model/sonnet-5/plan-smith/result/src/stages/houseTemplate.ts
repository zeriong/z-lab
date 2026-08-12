import { BlockDef, MaterialType, PigDef } from '../types/stage';

export interface HouseSpec {
  idPrefix: string;
  cx: number;
  groundTop: number;
  pillarMaterial: MaterialType;
  /** 다중 재질 결합 구조물(콘텐츠 축 6-8)을 위한 우측 기둥 재질 오버라이드. 미지정 시 pillarMaterial과 동일. */
  pillarMaterialRight?: MaterialType;
  roofMaterial: MaterialType;
}

export interface HouseParts {
  blocks: BlockDef[];
  pig: PigDef;
}

/**
 * 기둥 2개 + 지붕 1개 + 돼지 1마리로 구성된 반복 구조 유닛.
 * 10개 스테이지 콘텐츠 저작(스텝 2)에서 공통으로 쓰는 데이터 저작 보조 함수 — 게임 로직이 아니라 데이터 생성기.
 */
export function makeHouse(spec: HouseSpec): HouseParts {
  const { idPrefix, cx, groundTop, pillarMaterial, roofMaterial } = spec;
  const pillarMaterialRight = spec.pillarMaterialRight ?? pillarMaterial;

  return {
    blocks: [
      {
        id: `${idPrefix}-pillar-l`,
        material: pillarMaterial,
        x: cx - 35,
        y: groundTop - 40,
        width: 28,
        height: 80,
      },
      {
        id: `${idPrefix}-pillar-r`,
        material: pillarMaterialRight,
        x: cx + 35,
        y: groundTop - 40,
        width: 28,
        height: 80,
      },
      {
        id: `${idPrefix}-roof`,
        material: roofMaterial,
        x: cx,
        y: groundTop - 90,
        width: 110,
        height: 30,
      },
    ],
    pig: {
      id: `${idPrefix}-pig`,
      x: cx,
      y: groundTop - 18,
      radius: 18,
    },
  };
}
