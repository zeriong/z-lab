// 스테이지 10개 정적 import (비동기 로딩 없음, §4.9)
import type { StageData } from '../types';
import { stage01 } from './stage01';
import { stage02 } from './stage02';
import { stage03 } from './stage03';
import { stage04 } from './stage04';
import { stage05 } from './stage05';
import { stage06 } from './stage06';
import { stage07 } from './stage07';
import { stage08 } from './stage08';
import { stage09 } from './stage09';
import { stage10 } from './stage10';

export const STAGES: readonly StageData[] = [
  stage01,
  stage02,
  stage03,
  stage04,
  stage05,
  stage06,
  stage07,
  stage08,
  stage09,
  stage10,
];
