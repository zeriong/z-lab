import { MaterialType } from '../types/stage';

/**
 * 재질별 파괴 임계값(충격량 기준). glass < wood < stone.
 * 초기값·임의 태그 — 콜드스타트 테이블 참조, 첫 플레이테스트 후 조정.
 */
export const MATERIAL_THRESHOLDS: Record<MaterialType, number> = {
  glass: 4,
  wood: 8,
  stone: 16,
};

/** 돼지가 제거되는 데 필요한 최소 충격량. 초기값·임의 태그. */
export const PIG_IMPACT_THRESHOLD = 3;
