import { LevelData } from '../core/types';

export function validateLevelData(data: any): LevelData {
  // Basic validation
  if (!data.id || !data.name || !data.world || !data.slingshot || !data.birds) {
    throw new Error('Invalid level data');
  }

  return data as LevelData;
}
