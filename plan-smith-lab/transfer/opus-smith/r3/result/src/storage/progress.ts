const STORAGE_KEY_PREFIX = 'angrybirds_';
const STORAGE_KEY_HIGH_SCORE = `${STORAGE_KEY_PREFIX}high_score`;
const STORAGE_KEY_STARS = `${STORAGE_KEY_PREFIX}stars`;
const STORAGE_KEY_UNLOCKED = `${STORAGE_KEY_PREFIX}unlocked`;
const STORAGE_KEY_SOUND = `${STORAGE_KEY_PREFIX}sound`;
const STORAGE_KEY_VIEWPORT = `${STORAGE_KEY_PREFIX}viewport`;

interface ProgressData {
  highScores: Record<number, number>;
  stars: Record<number, number>;
  unlockedStages: Set<number>;
  soundEnabled: boolean;
}

let useLocalStorage = true;
const inMemoryData: ProgressData = {
  highScores: {},
  stars: {},
  unlockedStages: new Set([1]), // Stage 1 always unlocked
  soundEnabled: true,
};

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

useLocalStorage = isLocalStorageAvailable();

export function loadProgress(): ProgressData {
  if (!useLocalStorage) {
    return { ...inMemoryData };
  }

  try {
    const highScoresStr = localStorage.getItem(STORAGE_KEY_HIGH_SCORE);
    const starsStr = localStorage.getItem(STORAGE_KEY_STARS);
    const unlockedStr = localStorage.getItem(STORAGE_KEY_UNLOCKED);
    const soundStr = localStorage.getItem(STORAGE_KEY_SOUND);

    const highScores: Record<number, number> = highScoresStr ? JSON.parse(highScoresStr) : {};
    const stars: Record<number, number> = starsStr ? JSON.parse(starsStr) : {};
    const unlockedStages = new Set<number>(unlockedStr ? JSON.parse(unlockedStr) : [1]);
    const soundEnabled = soundStr ? JSON.parse(soundStr) : true;

    if (unlockedStages.size === 0) {
      unlockedStages.add(1);
    }

    return { highScores, stars, unlockedStages, soundEnabled };
  } catch (e) {
    console.error('Failed to load progress from localStorage:', e);
    return { ...inMemoryData };
  }
}

export function saveProgress(data: ProgressData): void {
  if (!useLocalStorage) {
    Object.assign(inMemoryData, data);
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY_HIGH_SCORE, JSON.stringify(data.highScores));
    localStorage.setItem(STORAGE_KEY_STARS, JSON.stringify(data.stars));
    localStorage.setItem(STORAGE_KEY_UNLOCKED, JSON.stringify(Array.from(data.unlockedStages)));
    localStorage.setItem(STORAGE_KEY_SOUND, JSON.stringify(data.soundEnabled));
  } catch (e) {
    console.error('Failed to save progress to localStorage:', e);
  }
}

export function getHighScore(stageId: number, progress: ProgressData): number {
  return progress.highScores[stageId] || 0;
}

export function updateHighScore(stageId: number, score: number, progress: ProgressData): void {
  const currentHighScore = progress.highScores[stageId] || 0;
  if (score > currentHighScore) {
    progress.highScores[stageId] = score;
  }
}

export function getStars(stageId: number, progress: ProgressData): number {
  return progress.stars[stageId] || 0;
}

export function updateStars(stageId: number, stars: number, progress: ProgressData): void {
  const currentStars = progress.stars[stageId] || 0;
  if (stars > currentStars) {
    progress.stars[stageId] = stars;
  }
}

export function unlockStage(stageId: number, progress: ProgressData): void {
  progress.unlockedStages.add(stageId);
}

export function isStageUnlocked(stageId: number, progress: ProgressData): boolean {
  return progress.unlockedStages.has(stageId);
}

export function getTotalStars(progress: ProgressData): number {
  let total = 0;
  for (let i = 1; i <= 10; i++) {
    total += getStars(i, progress);
  }
  return total;
}

export function getSoundEnabled(progress: ProgressData): boolean {
  return progress.soundEnabled;
}

export function setSoundEnabled(enabled: boolean, progress: ProgressData): void {
  progress.soundEnabled = enabled;
}

export function recordViewportOrientation(): void {
  if (!useLocalStorage) return;

  try {
    const isPortrait = window.innerHeight > window.innerWidth;
    const key = `${STORAGE_KEY_VIEWPORT}_${isPortrait ? 'portrait' : 'landscape'}`;
    const count = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(count));
  } catch (e) {
    console.error('Failed to record viewport:', e);
  }
}
