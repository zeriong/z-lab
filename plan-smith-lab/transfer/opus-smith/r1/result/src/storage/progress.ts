export interface Progress {
  unlockedUpto: number
  stageScores: { [stageNum: number]: number }
  stageStars: { [stageNum: number]: number }
}

const STORAGE_KEY = 'angrybirds_progress'

function getDefaultProgress(): Progress {
  return {
    unlockedUpto: 1,
    stageScores: {},
    stageStars: {}
  }
}

let cachedProgress: Progress | null = null

export function loadProgress(): Progress {
  if (cachedProgress) return cachedProgress

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      cachedProgress = JSON.parse(stored)
      return cachedProgress
    }
  } catch (e) {
    // localStorage not available
  }

  cachedProgress = getDefaultProgress()
  return cachedProgress
}

export function saveProgress(progress: Progress) {
  cachedProgress = progress
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (e) {
    // localStorage not available, only in-memory
  }
}

export function updateStageProgress(stageNum: number, score: number, stars: number) {
  const progress = loadProgress()

  // Update max score
  if (!progress.stageScores[stageNum] || progress.stageScores[stageNum] < score) {
    progress.stageScores[stageNum] = score
  }

  // Update max stars
  if (!progress.stageStars[stageNum] || progress.stageStars[stageNum] < stars) {
    progress.stageStars[stageNum] = stars
  }

  // Unlock next stage
  if (stageNum >= progress.unlockedUpto) {
    progress.unlockedUpto = Math.min(stageNum + 1, 10)
  }

  saveProgress(progress)
  return progress
}

export function getStageProgress(stageNum: number) {
  const progress = loadProgress()
  return {
    score: progress.stageScores[stageNum] || 0,
    stars: progress.stageStars[stageNum] || 0
  }
}

export function isStageUnlocked(stageNum: number): boolean {
  const progress = loadProgress()
  return stageNum <= progress.unlockedUpto
}

export function getTotalStars(): number {
  const progress = loadProgress()
  return Object.values(progress.stageStars).reduce((a, b) => a + (b || 0), 0)
}
