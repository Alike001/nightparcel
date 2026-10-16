import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../../../contract/managed/nightparcel');
const destination = path.resolve(here, '../public/managed/nightparcel');

for (const directory of ['keys', 'zkir']) {
  const required = path.join(source, directory);
  if (!existsSync(required)) {
    console.error(`[copy:zk] ${required} is missing. Run \`yarn compile\` first.`);
    process.exit(1);
  }
}

rmSync(destination, { recursive: true, force: true });
for (const directory of ['keys', 'zkir']) {
  cpSync(path.join(source, directory), path.join(destination, directory), { recursive: true });
}
console.log('[copy:zk] copied NightParcel proving assets to public/managed/nightparcel');
