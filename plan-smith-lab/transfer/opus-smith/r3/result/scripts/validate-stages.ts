import * as fs from 'fs';
import * as path from 'path';
import { parseStageDef } from '../src/data/schema';

async function validateStages(): Promise<void> {
  const stagesDir = path.join(__dirname, '../src/data/stages');
  let validCount = 0;
  let invalidCount = 0;
  const errors: { file: string; error: string }[] = [];

  for (let i = 1; i <= 10; i++) {
    const padded = String(i).padStart(2, '0');
    const filePath = path.join(stagesDir, `${padded}.json`);

    if (!fs.existsSync(filePath)) {
      errors.push({ file: `${padded}.json`, error: 'File not found' });
      invalidCount++;
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      const stageDef = parseStageDef(data);

      // Additional validations
      if (stageDef.bodies.length > 80) {
        errors.push({ file: `${padded}.json`, error: 'Too many bodies (>80)' });
        invalidCount++;
      } else {
        validCount++;
      }
    } catch (error) {
      errors.push({ file: `${padded}.json`, error: String(error) });
      invalidCount++;
    }
  }

  // Output results
  console.log(`${validCount}/10 stages valid`);

  if (errors.length > 0) {
    console.error('\nValidation errors:');
    for (const err of errors) {
      console.error(`  ${err.file}: ${err.error}`);
    }
    process.exit(1);
  }

  process.exit(validCount === 10 ? 0 : 1);
}

validateStages().catch((error) => {
  console.error(error);
  process.exit(1);
});
