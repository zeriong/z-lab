/**
 * 영속 계층 (R8). localStorage + 스키마 버전 키.
 * 플랜 §3: 형식이 바뀌면 "마이그레이션 아니면 초기화" 둘 중 하나로만 갈린다.
 * 저장 값이 깨져 있으면 크래시 대신 초기 상태로 복구하고 1회 안내한다(§1-B R8).
 */

const KEY = 'ab10.save';
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  /** 해금된 최대 스테이지 번호 (1..10) */
  unlocked: number;
  /** 스테이지 번호 → 획득 별(0..3) */
  stars: Record<string, number>;
  muted: boolean;
}

export interface LoadResult {
  data: SaveData;
  /** 손상 복구가 일어났는가 → 1회 안내 토스트용 */
  recovered: boolean;
}

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, unlocked: 1, stars: {}, muted: false };
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 어떤 형태로 깨져 있어도 예외를 밖으로 던지지 않는다. */
export function loadSave(): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { data: defaultSave(), recovered: false }; // 스토리지 자체가 막힌 환경
  }
  if (raw === null) return { data: defaultSave(), recovered: false };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainRecord(parsed)) throw new Error('저장 값이 객체가 아니다');

    const version = parsed.version;
    if (version !== SAVE_VERSION) {
      // v1 이전 형식은 존재하지 않으므로 마이그레이션 대상이 없다 → 초기화 경로.
      throw new Error(`알 수 없는 저장 버전: ${String(version)}`);
    }

    const unlockedRaw = parsed.unlocked;
    const unlocked =
      typeof unlockedRaw === 'number' && Number.isFinite(unlockedRaw)
        ? Math.min(10, Math.max(1, Math.floor(unlockedRaw)))
        : 1;

    const stars: Record<string, number> = {};
    if (isPlainRecord(parsed.stars)) {
      for (const [k, v] of Object.entries(parsed.stars)) {
        const id = Number(k);
        if (!Number.isInteger(id) || id < 1 || id > 10) continue;
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        stars[String(id)] = Math.min(3, Math.max(0, Math.floor(v)));
      }
    }

    const muted = parsed.muted === true;
    return { data: { version: SAVE_VERSION, unlocked, stars, muted }, recovered: false };
  } catch (err) {
    console.warn('[storage] 저장 값 손상 → 초기 상태로 복구합니다.', err);
    const fresh = defaultSave();
    persist(fresh);
    return { data: fresh, recovered: true };
  }
}

export function persist(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[storage] 저장 실패(무시)', err);
  }
}

/** 클리어 기록: 별은 최고 기록만 갱신, 해금은 다음 스테이지까지 */
export function recordClear(data: SaveData, stageId: number, stars: number): SaveData {
  const key = String(stageId);
  const prev = data.stars[key] ?? 0;
  if (stars > prev) data.stars[key] = stars;
  if (stageId + 1 > data.unlocked && stageId < 10) data.unlocked = stageId + 1;
  persist(data);
  return data;
}

export function setMuted(data: SaveData, muted: boolean): SaveData {
  data.muted = muted;
  persist(data);
  return data;
}

export function starsOf(data: SaveData, stageId: number): number {
  return data.stars[String(stageId)] ?? 0;
}
