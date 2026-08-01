/** 충돌 카테고리 비트 (플랜 §2 physics/). */
export const CATEGORY = {
  GROUND: 0x0001,
  BLOCK: 0x0002,
  PIG: 0x0004,
  BIRD: 0x0008,
  /** 파편은 물리 바디로 만들지 않지만(파티클), 예약해 둔다. */
  DEBRIS: 0x0010,
} as const;

export type CategoryName = keyof typeof CATEGORY;

/** 기본 마스크: 모든 게임 바디는 서로 충돌한다. */
export const MASK_DEFAULT =
  CATEGORY.GROUND | CATEGORY.BLOCK | CATEGORY.PIG | CATEGORY.BIRD;
