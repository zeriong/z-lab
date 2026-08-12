import { LevelConfig } from '../game/Level';

export function validateLevelConfig(config: any): config is LevelConfig {
  // Basic structure validation
  if (!config.id || !config.name || !config.world || !config.slingshot) {
    console.warn('Invalid level config: missing required fields');
    return false;
  }

  if (!Array.isArray(config.birds) || !Array.isArray(config.ground) ||
      !Array.isArray(config.blocks) || !Array.isArray(config.pigs)) {
    console.warn('Invalid level config: arrays missing');
    return false;
  }

  // Validate no initial overlaps (basic check)
  config.blocks.forEach((block: any) => {
    config.pigs.forEach((pig: any) => {
      const dx = block.x - pig.x;
      const dy = block.y - pig.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const blockRadius = block.r || Math.max(block.w || 0, block.h || 0) / 2;
      const pigRadius = 12;

      if (dist < blockRadius + pigRadius) {
        console.warn(`Initial overlap detected: block and pig at (${block.x}, ${block.y}) and (${pig.x}, ${pig.y})`);
      }
    });
  });

  return true;
}
