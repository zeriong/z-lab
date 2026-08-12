/**
 * 저작된 10개 스테이지의 정적 매니페스트.
 *
 * import.meta.glob 대신 명시적 import를 쓴 이유: 파일이 하나 빠지면
 * **빌드가 깨져야** 하기 때문이다. glob은 9개만 있어도 조용히 성공하고,
 * 그러면 §12의 "10스테이지가 1스테이지 + 로더로 퇴화" 리스크를 못 잡는다.
 */

import s01 from './01.json';
import s02 from './02.json';
import s03 from './03.json';
import s04 from './04.json';
import s05 from './05.json';
import s06 from './06.json';
import s07 from './07.json';
import s08 from './08.json';
import s09 from './09.json';
import s10 from './10.json';

/** 스키마 파서를 통과하기 전의 원시 데이터. 파싱은 loader/app이 한다. */
export const STAGE_SOURCES: readonly unknown[] = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10];

export const STAGE_FILE_NAMES: readonly string[] = [
  '01.json',
  '02.json',
  '03.json',
  '04.json',
  '05.json',
  '06.json',
  '07.json',
  '08.json',
  '09.json',
  '10.json',
];
