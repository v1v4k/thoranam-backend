import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { URL } from 'node:url';

const directory = new URL('../src/db/migrations', import.meta.url);
const files = readdirSync(directory, { recursive: true });
if (!files.some((file) => file.endsWith('.sql'))) {
  console.log(
    'No reviewed SQL migrations exist yet; no database changes made.',
  );
} else {
  const result = spawnSync('drizzle-kit', ['migrate'], { stdio: 'inherit' });
  if (result.error) {
    console.error('Could not start the migration tool.');
  }
  process.exitCode = result.status ?? 1;
}
