import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateStageDef } from '../src/data/schema';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stagesDir = path.join(__dirname, '../src/data/stages');

interface ValidationResult {
  file: string;
  valid: boolean;
  error?: string;
}

async function validateStages(): Promise<void> {
  const results: ValidationResult[] = [];
  const files = fs.readdirSync(stagesDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const filePath = path.join(stagesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      validateStageDef(data, file);

      // Additional validations
      if (!data.pigs || data.pigs.length < 1) {
        results.push({ file, valid: false, error: 'Must have at least 1 pig' });
        continue;
      }
      if (!data.birds || data.birds.length < 1) {
        results.push({ file, valid: false, error: 'Must have at least 1 bird' });
        continue;
      }
      if (data.bodies && data.bodies.length > 80) {
        results.push({ file, valid: false, error: 'Too many bodies (max 80)' });
        continue;
      }

      results.push({ file, valid: true });
    } catch (err: any) {
      results.push({ file, valid: false, error: err.message });
    }
  }

  // Print results
  const validCount = results.filter(r => r.valid).length;
  console.log(`${validCount}/${results.length} stages valid`);

  for (const result of results) {
    if (!result.valid) {
      console.error(`✗ ${result.file}: ${result.error}`);
    }
  }

  if (validCount !== results.length) {
    process.exit(1);
  }
}

validateStages().catch(err => {
  console.error(err);
  process.exit(1);
});
