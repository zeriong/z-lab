// 진행도: 클리어한 최고 스테이지를 localStorage에 저장.
const KEY = 'angry-slingshot.progress.v1';

export function getMaxCleared(): number {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isInteger(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setCleared(stageId: number): void {
  try {
    if (stageId > getMaxCleared()) localStorage.setItem(KEY, String(stageId));
  } catch {
    // localStorage 불가 환경(시크릿 등)에서는 진행도 저장만 포기
  }
}
