import { parseLevel, type LevelData } from '../levelSchema';

import raw01 from './level01.json';
import raw02 from './level02.json';
import raw03 from './level03.json';
import raw04 from './level04.json';
import raw05 from './level05.json';
import raw06 from './level06.json';
import raw07 from './level07.json';
import raw08 from './level08.json';
import raw09 from './level09.json';
import raw10 from './level10.json';

/**
 * Levels are statically imported (plan §4.1): 10 files of a few KB each do not
 * justify a network loader or a preloader screen. LOADING stays in the state
 * machine as a formal one-frame state so async loading can be dropped in later
 * without touching the flow.
 *
 * parseLevel() runs at module init, so a malformed level fails loudly at boot
 * instead of halfway through a session.
 */
const RAW: unknown[] = [raw01, raw02, raw03, raw04, raw05, raw06, raw07, raw08, raw09, raw10];

export const LEVELS: LevelData[] = RAW.map(parseLevel);

export const LEVEL_COUNT = LEVELS.length;

export function getLevel(id: number): LevelData | null {
  return LEVELS.find((level) => level.id === id) ?? null;
}
