import { STORAGE_KEY, TOTAL_STAGES } from '../config.js';

/**
 * 계획서 §5-2: 진행도 저장. { unlockedStage: number, stars: { [stageId]: 0|1|2|3 } }
 * @typedef {Object} SaveData
 * @property {number} unlockedStage
 * @property {Record<number, 0|1|2|3>} stars
 */

/** @returns {SaveData} */
function defaultSave() {
  return { unlockedStage: 1, stars: {} };
}

/** @returns {SaveData} */
export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    return {
      unlockedStage: parsed.unlockedStage ?? 1,
      stars: parsed.stars ?? {},
    };
  } catch (e) {
    return defaultSave();
  }
}

/** @param {SaveData} save */
export function saveProgress(save) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

/**
 * 스테이지 클리어 결과를 저장에 반영한다. 다음 스테이지 unlock, 별점은 더 높은 값만 덮어쓴다
 * (재도전으로 점수가 낮아져도 기존 별점 유지, §5-2).
 * @param {number} stageId
 * @param {number} starsEarned
 * @returns {SaveData}
 */
export function recordStageResult(stageId, starsEarned) {
  const save = loadSave();
  const nextUnlock = Math.min(stageId + 1, TOTAL_STAGES);
  if (nextUnlock > save.unlockedStage) save.unlockedStage = nextUnlock;
  const prevStars = save.stars[stageId] ?? 0;
  save.stars[stageId] = Math.max(prevStars, starsEarned);
  saveProgress(save);
  return save;
}
