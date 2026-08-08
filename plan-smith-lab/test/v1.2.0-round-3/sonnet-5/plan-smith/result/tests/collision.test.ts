import { describe, expect, it } from "vitest";
import { breakThresholdFor, exceedsThreshold } from "../src/scoring";

describe("collision threshold judging (Definition of done — 양방향 단언)", () => {
  it("임계값 이상의 충격량은 제거로 판정한다", () => {
    const threshold = 10;
    expect(exceedsThreshold(10, threshold)).toBe(true);
    expect(exceedsThreshold(15, threshold)).toBe(true);
  });

  it("임계값 미만의 충격량은 유지로 판정한다(한쪽만 확인하면 순환 판정이 되므로 반대 방향도 단언)", () => {
    const threshold = 10;
    expect(exceedsThreshold(9.99, threshold)).toBe(false);
    expect(exceedsThreshold(0, threshold)).toBe(false);
  });
});

describe("material break threshold ordering (Step 4 검증 — 얼음 < 나무 < 돌)", () => {
  it("재질별 파괴 난이도 서열이 항상 얼음 < 나무 < 돌 순서로 유지된다", () => {
    const ice = breakThresholdFor("ice");
    const wood = breakThresholdFor("wood");
    const stone = breakThresholdFor("stone");
    expect(ice).toBeLessThan(wood);
    expect(wood).toBeLessThan(stone);
  });
});
