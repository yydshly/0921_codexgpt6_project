import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const base = 'https://yydshly.github.io/0921_codexgpt6_project/';
const root = fileURLToPath(new URL('../moon-studio/dist/client/', import.meta.url));
async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? listFiles(path.join(directory, entry.name), `${prefix}${entry.name}/`)
    : `${prefix}${entry.name}`))).flat();
}
const pending = await listFiles(root);
const results = [];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (pending.length) {
    const file = pending.shift();
    let result;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(new URL(file, base), {
          method: 'HEAD', signal: AbortSignal.timeout(15000),
        });
        result = { file, status: response.status, type: response.headers.get('content-type') };
        if (response.status < 500) break;
      } catch (error) {
        result = { file, status: 0, error: error.message };
      }
    }
    results.push(result);
  }
}));
const failures = results.filter(result => result.status !== 200);
console.log(JSON.stringify({ base, checked: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
