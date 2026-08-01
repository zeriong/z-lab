/**
 * UI 문자열 한 곳 모음.
 * i18n 은 플랜 §1-B에서 "보류(트리거: 한국어 외 요구 발생 시)" — 그때 교체 비용만 확보해 둔다.
 */
export const STR = {
  soundOn: '소리 켜짐',
  soundOff: '소리 꺼짐',
  clearTitle: '스테이지 클리어!',
  failTitle: '실패…',
  next: '다음 스테이지',
  retry: '다시하기',
  home: '메인으로',
  resume: '계속하기',
  allClear: '전체 클리어!',
  scorePigs: '돼지 제거',
  scoreBlocks: '구조물 파괴',
  scoreBirds: '남은 새 보너스',
  starHint: (star2: number, star3: number): string => `★★ ${star2} / ★★★ ${star3}`,
  locked: '잠김',
  saveRecovered: '저장 데이터가 손상되어 초기 상태로 복구했습니다.',
  failHint: '새를 다 썼습니다. 다시 시도해 보세요.',
} as const;
